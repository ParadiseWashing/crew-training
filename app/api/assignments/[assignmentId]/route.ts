import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── DELETE /api/assignments/[assignmentId] ──────────────────────────────────
// Admin-only. Removes a subject assignment from a user. The user's underlying
// progress (step completions, quiz attempts, sign-offs) is intentionally kept,
// so re-assigning the same subject later restores their place.

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { assignmentId } = await params;

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { id: true },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  await prisma.assignment.delete({ where: { id: assignmentId } });

  return NextResponse.json({ success: true });
}
