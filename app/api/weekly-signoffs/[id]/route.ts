import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-audit";

// DELETE — admin-only. Removes a weekly sign-off so it can be re-done.
// Sign-offs are hiring/training evidence, so every deletion is recorded.
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const signOff = await prisma.weeklySignOff.findUnique({
    where: { id },
    include: {
      trainee: { select: { id: true, name: true } },
      trainer: { select: { id: true, name: true } },
      subject: { select: { id: true, title: true } },
    },
  });

  if (!signOff) {
    return NextResponse.json({ error: "Sign-off not found" }, { status: 404 });
  }

  await prisma.weeklySignOff.delete({ where: { id } });

  await logAdminAction({
    actorId: session.user.id,
    actorName: session.user.name ?? "Admin",
    action: "DELETE_WEEKLY_SIGNOFF",
    entityType: "WeeklySignOff",
    entityId: id,
    summary: `Deleted week ${signOff.weekNumber} sign-off for ${signOff.trainee.name} on "${signOff.subject.title}" (was ${signOff.decision})`,
    metadata: {
      traineeId: signOff.traineeUserId,
      trainerName: signOff.trainer.name,
      subjectId: signOff.subjectId,
      weekNumber: signOff.weekNumber,
      decision: signOff.decision,
      topicRatings: signOff.topicRatings,
      notes: signOff.notes,
      signedAt: signOff.signedAt.toISOString(),
      trainerSignedName: signOff.trainerSignedName,
    },
  });

  return NextResponse.json({ success: true });
}
