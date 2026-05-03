import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ quizId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quizId } = await params;
  const body = await req.json();
  const { answers } = body; // { questionId: answer }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true },
  });

  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  // Check attempt count
  const attemptCount = await prisma.quizAttempt.count({
    where: { quizId, userId: session.user.id },
  });

  if (attemptCount >= quiz.maxAttempts) {
    return NextResponse.json({ error: "Max attempts reached" }, { status: 400 });
  }

  // Grade the quiz
  let correct = 0;
  let gradeable = 0;

  for (const question of quiz.questions) {
    if (question.type === "WRITTEN_RESPONSE") continue; // manually graded
    gradeable++;

    const userAnswer = answers[question.id];
    const correctAnswer = question.correctAnswer;

    if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
      if (userAnswer === correctAnswer) correct++;
    } else if (question.type === "MULTIPLE_SELECT") {
      const ua = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
      const ca = Array.isArray(correctAnswer) ? [...(correctAnswer as string[])].sort() : [];
      if (JSON.stringify(ua) === JSON.stringify(ca)) correct++;
    }
  }

  const score = gradeable > 0 ? Math.round((correct / gradeable) * 100) : 0;
  const passed = score >= quiz.passingScore;

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      userId: session.user.id,
      score,
      passed,
      answers,
      attemptNum: attemptCount + 1,
    },
  });

  return NextResponse.json({ ...attempt, correctCount: correct, totalGradeable: gradeable });
}
