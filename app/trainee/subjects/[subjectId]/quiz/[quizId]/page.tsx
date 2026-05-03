import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/shared/page-header";
import { QuizTaker } from "./quiz-taker";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ subjectId: string; quizId: string }>;
}

export default async function QuizPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { subjectId, quizId } = await params;

  // Verify the user has access to this subject
  const assignment = await prisma.assignment.findFirst({
    where: { userId: session.user.id, subjectId },
  });
  if (!assignment) notFound();

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      topic: {
        include: {
          subject: { select: { id: true, title: true } },
        },
      },
      questions: { orderBy: { orderIndex: "asc" } },
      attempts: {
        where: { userId: session.user.id },
        orderBy: { attemptNum: "desc" },
      },
    },
  });

  if (!quiz) notFound();

  // Strip correct answers before sending to client
  const questionsForClient = quiz.questions.map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type,
    options: (q.options as string[] | null) ?? [],
    orderIndex: q.orderIndex,
  }));

  const attemptsForClient = quiz.attempts.map((a) => ({
    id: a.id,
    score: a.score,
    passed: a.passed,
    attemptNum: a.attemptNum,
    takenAt: a.takenAt.toISOString(),
    answers: a.answers as Record<string, unknown>,
  }));

  // We need correct answers to show results — pass as server-side only for review
  // We include them in a separate map that the server page will pass
  const correctAnswerMap = Object.fromEntries(
    quiz.questions.map((q) => [q.id, q.correctAnswer])
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Training", href: "/trainee/home" },
          {
            label: quiz.topic.subject.title,
            href: `/trainee/subjects/${subjectId}`,
          },
          { label: `${quiz.topic.title} — Quiz` },
        ]}
      />

      <QuizTaker
        quizId={quiz.id}
        subjectId={subjectId}
        topicTitle={quiz.topic.title}
        subjectTitle={quiz.topic.subject.title}
        passingScore={quiz.passingScore}
        maxAttempts={quiz.maxAttempts}
        questions={questionsForClient}
        existingAttempts={attemptsForClient}
        correctAnswerMap={correctAnswerMap as Record<string, unknown>}
      />
    </div>
  );
}
