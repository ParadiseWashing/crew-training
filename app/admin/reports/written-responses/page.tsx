import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import type { WrittenGrades } from "@/lib/quiz-grading";
import { WrittenResponsesClient, type AttemptRow } from "./written-responses-client";

export const dynamic = "force-dynamic";

export default async function WrittenResponsesPage() {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") redirect("/login");

  const attempts = await prisma.quizAttempt.findMany({
    where: { quiz: { questions: { some: { type: "WRITTEN_RESPONSE" } } } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      quiz: {
        select: {
          id: true,
          passingScore: true,
          questions: {
            where: { type: "WRITTEN_RESPONSE" },
            select: { id: true, text: true, orderIndex: true },
            orderBy: { orderIndex: "asc" },
          },
          topic: {
            select: { id: true, title: true, subject: { select: { id: true, title: true } } },
          },
        },
      },
    },
    orderBy: { takenAt: "desc" },
  });

  const graderIds = [...new Set(attempts.map((a) => a.gradedById).filter(Boolean) as string[])];
  const graders = graderIds.length
    ? await prisma.user.findMany({
        where: { id: { in: graderIds } },
        select: { id: true, name: true },
      })
    : [];
  const graderName = new Map(graders.map((g) => [g.id, g.name]));

  const rows: AttemptRow[] = attempts.map((a) => {
    const answers = (a.answers as Record<string, unknown>) ?? {};
    const grades = (a.writtenGrades as WrittenGrades | null) ?? {};
    return {
      id: a.id,
      score: a.score,
      passed: a.passed,
      attemptNum: a.attemptNum,
      takenAt: a.takenAt.toISOString(),
      gradedAt: a.gradedAt ? a.gradedAt.toISOString() : null,
      gradedByName: a.gradedById ? (graderName.get(a.gradedById) ?? "Admin") : null,
      passingScore: a.quiz.passingScore,
      user: a.user,
      subjectTitle: a.quiz.topic.subject.title,
      topicTitle: a.quiz.topic.title,
      questions: a.quiz.questions.map((q) => {
        const raw = answers[q.id];
        return {
          id: q.id,
          text: q.text,
          answer: typeof raw === "string" ? raw : raw == null ? "" : JSON.stringify(raw),
          grade: grades[q.id] ?? null,
        };
      }),
    };
  });

  const pending = rows.filter((r) => r.questions.some((q) => !q.grade)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Written Responses"
        description={
          rows.length === 0
            ? "Written answers show up here as soon as trainees submit them. Grading recalculates the trainee's score."
            : pending > 0
              ? `${pending} quiz attempt${pending !== 1 ? "s" : ""} have written answers waiting on your review. Grading recalculates the trainee's score.`
              : "Every written answer has been reviewed. Grading recalculates the trainee's score."
        }
      />
      <WrittenResponsesClient rows={rows} />
    </div>
  );
}
