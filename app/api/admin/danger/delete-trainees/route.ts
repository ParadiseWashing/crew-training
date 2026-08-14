import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-audit";

const CONFIRM = "DELETE ALL TRAINEES";

/**
 * POST — permanently removes every TRAINEE account. Admin accounts survive.
 *
 * Cascades take their progress, assignments, quiz attempts, sign-offs and
 * handbook signatures with them, so the full roster is snapshotted into the
 * admin audit log first.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== CONFIRM) {
    return NextResponse.json({ error: `Type "${CONFIRM}" exactly to confirm.` }, { status: 400 });
  }

  const trainees = await prisma.user.findMany({
    where: { systemRole: "TRAINEE" },
    select: {
      id: true,
      name: true,
      email: true,
      inviteStatus: true,
      createdAt: true,
      _count: { select: { assignments: true, quizAttempts: true, handbookSignatures: true } },
    },
  });

  if (trainees.length === 0) {
    return NextResponse.json({ error: "There are no trainee accounts to delete." }, { status: 400 });
  }

  await prisma.user.deleteMany({ where: { systemRole: "TRAINEE" } });

  await logAdminAction({
    actorId: session.user.id,
    actorName: session.user.name ?? "Admin",
    action: "DELETE_ALL_TRAINEES",
    entityType: "Global",
    entityId: "all",
    summary: `Deleted all ${trainees.length} trainee account${trainees.length === 1 ? "" : "s"} and their training records`,
    metadata: {
      deleted: trainees.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        inviteStatus: t.inviteStatus,
        createdAt: t.createdAt.toISOString(),
        assignments: t._count.assignments,
        quizAttempts: t._count.quizAttempts,
        handbookSignatures: t._count.handbookSignatures,
      })),
    },
  });

  return NextResponse.json({ success: true, deleted: trainees.length });
}
