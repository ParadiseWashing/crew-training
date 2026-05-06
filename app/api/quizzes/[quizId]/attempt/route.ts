import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ quizId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quizId } = await params;
  const body = await req.json();
  const { answers, timeTakenSeconds = 0 } = body;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: true,
      topic: {
        include: {
          subject: {
            include: {
              topics: {
                include: {
                  steps: { select: { id: true } },
                  quiz: { select: { id: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  // Check attempt count
  const existingAttempts = await prisma.quizAttempt.findMany({
    where: { quizId, userId: session.user.id },
    orderBy: { attemptNum: "asc" },
  });

  if (existingAttempts.length >= quiz.maxAttempts) {
    return NextResponse.json({ error: "Max attempts reached" }, { status: 400 });
  }

  // Grade the quiz
  let correct = 0;
  let gradeable = 0;

  for (const question of quiz.questions) {
    if (question.type === "WRITTEN_RESPONSE") continue;
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
  const attemptNum = existingAttempts.length + 1;

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      userId: session.user.id,
      score,
      passed,
      answers,
      attemptNum,
      timeTakenSeconds,
    },
  });

  const subject = quiz.topic.subject;
  const allQuizIds = subject.topics.flatMap((t) => (t.quiz ? [t.quiz.id] : []));
  const allStepIds = subject.topics.flatMap((t) => t.steps.map((s) => s.id));

  // ── Audit flags ───────────────────────────────────────────────────────────

  // QUIZ_SPEED: completed the quiz in under 30 seconds
  if (timeTakenSeconds > 0 && timeTakenSeconds < 30 && gradeable > 0) {
    await prisma.trainingAuditFlag.create({
      data: {
        userId: session.user.id,
        flagType: "QUIZ_SPEED",
        subjectId: subject.id,
        topicId: quiz.topicId,
        quizId,
        details: {
          timeTakenSeconds,
          score,
          passed,
          attemptNum,
          questionCount: gradeable,
        },
      },
    });
  }

  // QUIZ_PATTERN: failed attempts 1 & 2, passed attempt 3 (memorization pattern)
  if (passed && attemptNum === quiz.maxAttempts && quiz.maxAttempts >= 3) {
    const prevAttempts = existingAttempts.slice(0, quiz.maxAttempts - 1);
    const allPrevFailed = prevAttempts.every((a) => !a.passed);
    if (allPrevFailed && prevAttempts.length >= 2) {
      await prisma.trainingAuditFlag.create({
        data: {
          userId: session.user.id,
          flagType: "QUIZ_PATTERN",
          subjectId: subject.id,
          topicId: quiz.topicId,
          quizId,
          details: {
            pattern: "Failed all previous attempts then passed on final attempt",
            attemptScores: [...existingAttempts.map((a) => a.score), score],
            finalScore: score,
          },
        },
      });
    }
  }

  // ── Module reset on final failed attempt ──────────────────────────────────
  if (!passed && attemptNum >= quiz.maxAttempts) {
    // Save attempt history for audit before deleting
    const allAttemptsHistory = await prisma.quizAttempt.findMany({
      where: { quizId: { in: allQuizIds }, userId: session.user.id },
      select: { quizId: true, score: true, attemptNum: true, timeTakenSeconds: true, passed: true, takenAt: true },
    });

    // Flag the module reset
    await prisma.trainingAuditFlag.create({
      data: {
        userId: session.user.id,
        flagType: "RAPID_MODULE",
        subjectId: subject.id,
        topicId: quiz.topicId,
        quizId,
        details: {
          reason: "Failed all quiz attempts — module reset",
          subjectTitle: subject.title,
          attemptHistory: allAttemptsHistory,
        },
      },
    });

    // Delete all step progress for this subject
    await prisma.stepProgress.deleteMany({
      where: { userId: session.user.id, stepId: { in: allStepIds } },
    });

    // Delete all quiz attempts for this subject's quizzes
    await prisma.quizAttempt.deleteMany({
      where: { userId: session.user.id, quizId: { in: allQuizIds } },
    });

    // Reset assignment
    await prisma.assignment.updateMany({
      where: { userId: session.user.id, subjectId: subject.id },
      data: { status: "NOT_STARTED", progressPercentage: 0, completedAt: null },
    });

    return NextResponse.json({
      ...attempt,
      correctCount: correct,
      totalGradeable: gradeable,
      moduleReset: true,
    });
  }

  return NextResponse.json({ ...attempt, correctCount: correct, totalGradeable: gradeable });
}
