import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-audit";

const CONFIRM = "RESET ALL PROGRESS";

/**
 * POST — wipes training progress for every trainee.
 *
 * Deliberately narrow: step progress, quiz attempts and audit flags go, and
 * assignments are rewound to NOT_STARTED. Signed records (subject sign-offs,
 * weekly sign-offs, handbook signatures, working interviews) are legal/hiring
 * evidence and are never touched by this action.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== CONFIRM) {
    return NextResponse.json(
      { error: `Type "${CONFIRM}" exactly to confirm.` },
      { status: 400 }
    );
  }

  const [stepCount, attemptCount, flagCount, assignmentCount] = await Promise.all([
    prisma.stepProgress.count(),
    prisma.quizAttempt.count(),
    prisma.trainingAuditFlag.count(),
    prisma.assignment.count(),
  ]);

  await prisma.$transaction([
    prisma.stepProgress.deleteMany({}),
    prisma.quizAttempt.deleteMany({}),
    prisma.trainingAuditFlag.deleteMany({}),
    prisma.assignment.updateMany({
      data: { status: "NOT_STARTED", progressPercentage: 0, completedAt: null },
    }),
  ]);

  await logAdminAction({
    actorId: session.user.id,
    actorName: session.user.name ?? "Admin",
    action: "RESET_ALL_PROGRESS",
    entityType: "Global",
    entityId: "all",
    summary: `Reset all training progress — removed ${stepCount} step completions, ${attemptCount} quiz attempts and ${flagCount} audit flags; rewound ${assignmentCount} assignments`,
    metadata: { stepCount, attemptCount, flagCount, assignmentCount },
  });

  return NextResponse.json({
    success: true,
    stepCount,
    attemptCount,
    flagCount,
    assignmentCount,
  });
}
