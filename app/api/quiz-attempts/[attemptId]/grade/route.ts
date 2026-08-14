import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gradeAnswers, recomputeAssignment, type WrittenGrades } from "@/lib/quiz-grading";
import { logAdminAction } from "@/lib/admin-audit";

/**
 * POST — record an admin's verdicts on the WRITTEN_RESPONSE questions in an
 * attempt, then recompute the attempt's score/pass state and the trainee's
 * assignment status. Marking a written answer incorrect can un-pass an attempt.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { attemptId } = await params;
  const body = await req.json().catch(() => ({}));
  const incoming = body?.grades as WrittenGrades | undefined;

  if (!incoming || typeof incoming !== "object") {
    return NextResponse.json({ error: "grades is required" }, { status: 400 });
  }

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      user: { select: { id: true, name: true } },
      quiz: {
        include: {
          questions: true,
          topic: { select: { id: true, title: true, subjectId: true } },
        },
      },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  const writtenIds = new Set(
    attempt.quiz.questions.filter((q) => q.type === "WRITTEN_RESPONSE").map((q) => q.id)
  );

  // Merge onto any existing grades so a partial save doesn't wipe earlier work.
  const grades: WrittenGrades = {
    ...((attempt.writtenGrades as WrittenGrades | null) ?? {}),
  };

  for (const [questionId, value] of Object.entries(incoming)) {
    if (!writtenIds.has(questionId)) {
      return NextResponse.json(
        { error: `Question ${questionId} is not a written response on this quiz` },
        { status: 400 }
      );
    }
    if (value === null) {
      delete grades[questionId];
      continue;
    }
    const verdict = value?.verdict;
    if (verdict !== "CORRECT" && verdict !== "INCORRECT") {
      return NextResponse.json(
        { error: "Each grade needs a verdict of CORRECT or INCORRECT" },
        { status: 400 }
      );
    }
    const feedback =
      typeof value.feedback === "string" && value.feedback.trim()
        ? value.feedback.trim().slice(0, 2000)
        : undefined;
    grades[questionId] = feedback ? { verdict, feedback } : { verdict };
  }

  const hasAnyGrade = Object.keys(grades).length > 0;

  const { correct, gradeable, score, ungradedWritten } = gradeAnswers(
    attempt.quiz.questions,
    (attempt.answers as Record<string, unknown>) ?? {},
    grades
  );
  const passed = score >= attempt.quiz.passingScore;

  const updated = await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      writtenGrades: hasAnyGrade ? (grades as never) : undefined,
      score,
      passed,
      gradedById: hasAnyGrade ? session.user.id : null,
      gradedAt: hasAnyGrade ? new Date() : null,
    },
  });

  // Pass state may have flipped in either direction — resync the assignment.
  await recomputeAssignment(attempt.userId, attempt.quiz.topic.subjectId);

  await logAdminAction({
    actorId: session.user.id,
    actorName: session.user.name ?? "Admin",
    action: "GRADE_WRITTEN_RESPONSE",
    entityType: "QuizAttempt",
    entityId: attemptId,
    summary: `Graded ${attempt.user.name}'s written response(s) on "${attempt.quiz.topic.title}" — score ${Math.round(attempt.score)}% → ${score}% (${passed ? "passed" : "failed"})`,
    metadata: {
      previousScore: attempt.score,
      previousPassed: attempt.passed,
      newScore: score,
      newPassed: passed,
      grades,
    },
  });

  return NextResponse.json({
    ...updated,
    correctCount: correct,
    totalGradeable: gradeable,
    pendingWrittenReview: ungradedWritten,
  });
}
