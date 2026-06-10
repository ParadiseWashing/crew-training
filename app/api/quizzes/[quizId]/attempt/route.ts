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
  const allStepIds = subject.topics.flatMap((t) => t.steps.map((s) => s.id));

  // Passing a quiz can be the last requirement for finishing the subject:
  // if all steps are done and every topic quiz is now passed, mark it COMPLETED.
  if (passed) {
    const completedSteps = await prisma.stepProgress.count({
      where: { userId: session.user.id, stepId: { in: allStepIds } },
    });
    if (allStepIds.length > 0 && completedSteps === allStepIds.length) {
      const quizzes = await prisma.quiz.findMany({
        where: { topic: { subjectId: subject.id } },
        select: {
          id: true,
          attempts: {
            where: { userId: session.user.id, passed: true },
            select: { id: true },
            take: 1,
          },
        },
      });
      if (quizzes.every((q) => q.attempts.length > 0)) {
        await prisma.assignment.updateMany({
          where: { userId: session.user.id, subjectId: subject.id },
          data: { status: "COMPLETED", progressPercentage: 100, completedAt: new Date() },
        });
      }
    }
  }

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

  // ── Topic reset on final failed attempt ───────────────────────────────────
  // Failing all attempts on a topic's quiz resets ONLY that topic (its step
  // progress + its quiz attempts), so the trainee re-does that section with a
  // fresh set of attempts. Other completed topics are preserved.
  if (!passed && attemptNum >= quiz.maxAttempts) {
    const thisTopic = subject.topics.find((t) => t.id === quiz.topicId);
    const topicStepIds = thisTopic ? thisTopic.steps.map((s) => s.id) : [];

    // Save this topic's attempt history for audit before deleting
    const attemptHistory = await prisma.quizAttempt.findMany({
      where: { quizId, userId: session.user.id },
      select: { score: true, attemptNum: true, timeTakenSeconds: true, passed: true, takenAt: true },
    });

    await prisma.trainingAuditFlag.create({
      data: {
        userId: session.user.id,
        flagType: "RAPID_MODULE",
        subjectId: subject.id,
        topicId: quiz.topicId,
        quizId,
        details: {
          reason: "Failed all quiz attempts — topic reset",
          subjectTitle: subject.title,
          topicTitle: quiz.topic.title,
          attemptHistory,
        },
      },
    });

    // Reset just this topic: its step progress + its quiz attempts
    await prisma.stepProgress.deleteMany({
      where: { userId: session.user.id, stepId: { in: topicStepIds } },
    });
    await prisma.quizAttempt.deleteMany({
      where: { userId: session.user.id, quizId },
    });

    // Recompute the subject assignment's progress after the partial reset
    const remaining = await prisma.stepProgress.count({
      where: { userId: session.user.id, stepId: { in: allStepIds } },
    });
    const pct = allStepIds.length > 0 ? Math.round((remaining / allStepIds.length) * 100) : 0;
    await prisma.assignment.updateMany({
      where: { userId: session.user.id, subjectId: subject.id },
      data: {
        status: remaining > 0 ? "IN_PROGRESS" : "NOT_STARTED",
        progressPercentage: pct,
        completedAt: null,
      },
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
