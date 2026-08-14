import { prisma } from "@/lib/prisma";

export type WrittenVerdict = "CORRECT" | "INCORRECT";

export interface WrittenGrade {
  verdict: WrittenVerdict;
  feedback?: string;
}

/** Keyed by questionId. */
export type WrittenGrades = Record<string, WrittenGrade>;

export interface GradableQuestion {
  id: string;
  type: string;
  correctAnswer: unknown;
}

export interface GradeResult {
  correct: number;
  /** Number of questions that actually counted toward the score. */
  gradeable: number;
  score: number;
  /** Written questions still waiting on a human verdict — excluded from the score. */
  ungradedWritten: number;
}

/**
 * Grades an attempt.
 *
 * Auto-gradeable questions always count. WRITTEN_RESPONSE questions only enter
 * the denominator once an admin has graded them — so a trainee is never blocked
 * waiting on a human, but the score is corrected (and can flip to failing) the
 * moment their written answer is reviewed.
 */
export function gradeAnswers(
  questions: GradableQuestion[],
  answers: Record<string, unknown>,
  writtenGrades?: WrittenGrades | null
): GradeResult {
  let correct = 0;
  let gradeable = 0;
  let ungradedWritten = 0;

  for (const question of questions) {
    if (question.type === "WRITTEN_RESPONSE") {
      const grade = writtenGrades?.[question.id];
      if (!grade) {
        ungradedWritten++;
        continue;
      }
      gradeable++;
      if (grade.verdict === "CORRECT") correct++;
      continue;
    }

    gradeable++;
    const userAnswer = answers?.[question.id];
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
  return { correct, gradeable, score, ungradedWritten };
}

/**
 * Recomputes an Assignment's progress + status from the current source of truth
 * (step progress and passed quiz attempts). Safe to call after any change that
 * could make a subject newly complete — or newly incomplete.
 */
export async function recomputeAssignment(userId: string, subjectId: string) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      topics: {
        include: {
          steps: { select: { id: true } },
          quiz: { select: { id: true } },
        },
      },
    },
  });
  if (!subject) return;

  const assignment = await prisma.assignment.findFirst({ where: { userId, subjectId } });
  if (!assignment) return;

  const allStepIds = subject.topics.flatMap((t) => t.steps.map((s) => s.id));
  const completedSteps = allStepIds.length
    ? await prisma.stepProgress.count({ where: { userId, stepId: { in: allStepIds } } })
    : 0;
  const percentage = allStepIds.length
    ? Math.round((completedSteps / allStepIds.length) * 100)
    : 0;

  const quizIds = subject.topics.map((t) => t.quiz?.id).filter(Boolean) as string[];
  const passed = quizIds.length
    ? await prisma.quizAttempt.findMany({
        where: { userId, quizId: { in: quizIds }, passed: true },
        select: { quizId: true },
        distinct: ["quizId"],
      })
    : [];
  const passedIds = new Set(passed.map((a) => a.quizId));
  const allQuizzesPassed = quizIds.every((id) => passedIds.has(id));

  const complete =
    allStepIds.length > 0 && completedSteps === allStepIds.length && allQuizzesPassed;

  await prisma.assignment.update({
    where: { id: assignment.id },
    data: {
      status: complete ? "COMPLETED" : completedSteps > 0 ? "IN_PROGRESS" : "NOT_STARTED",
      progressPercentage: percentage,
      // Preserve the original completion timestamp if it's still complete.
      completedAt: complete ? (assignment.completedAt ?? new Date()) : null,
    },
  });
}
