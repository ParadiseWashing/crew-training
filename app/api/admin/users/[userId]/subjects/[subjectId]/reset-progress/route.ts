import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/users/[userId]/subjects/[subjectId]/reset-progress
// Wipes a trainee's progress within a single subject:
//   - StepProgress for every step inside the subject's topics
//   - QuizAttempt for every quiz inside the subject's topics
//   - SignOff for this user+subject
//   - Resets the Assignment row (status, progressPercentage, completedAt)
// Audit flags are left intact on purpose — they're an admin record.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string; subjectId: string }> }
) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, subjectId } = await params;

  // Verify the user + subject exist (and gather step/quiz IDs for this subject).
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

  if (!subject) {
    return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  }

  const stepIds = subject.topics.flatMap((t) => t.steps.map((s) => s.id));
  const quizIds = subject.topics
    .map((t) => t.quiz?.id)
    .filter((id): id is string => Boolean(id));

  const result = await prisma.$transaction(async (tx) => {
    const stepProgress = stepIds.length
      ? await tx.stepProgress.deleteMany({
          where: { userId, stepId: { in: stepIds } },
        })
      : { count: 0 };

    const quizAttempts = quizIds.length
      ? await tx.quizAttempt.deleteMany({
          where: { userId, quizId: { in: quizIds } },
        })
      : { count: 0 };

    const signOffs = await tx.signOff.deleteMany({
      where: { userId, subjectId },
    });

    // Reset assignment row if one exists. (updateMany so missing row is a no-op.)
    const assignment = await tx.assignment.updateMany({
      where: { userId, subjectId },
      data: {
        status: "NOT_STARTED",
        progressPercentage: 0,
        completedAt: null,
      },
    });

    return {
      stepProgressDeleted: stepProgress.count,
      quizAttemptsDeleted: quizAttempts.count,
      signOffsDeleted: signOffs.count,
      assignmentReset: assignment.count > 0,
    };
  });

  return NextResponse.json({ success: true, ...result });
}
