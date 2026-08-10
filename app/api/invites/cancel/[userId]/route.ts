import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/invites/cancel/[userId]
// Cancels a pending invite. Admin-only. Invites never expire on their own — this
// is the only way an invite becomes invalid. The invite token is cleared so the
// link stops working, and the user is moved to CANCELLED. The admin can re-send
// (which regenerates a token) later if they change their mind.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, inviteStatus: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.inviteStatus === "ACCEPTED") {
    return NextResponse.json(
      { error: "This user has already activated their account and can't be cancelled." },
      { status: 400 }
    );
  }
  if (user.inviteStatus === "CANCELLED") {
    return NextResponse.json({ error: "This invite is already cancelled." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { inviteStatus: "CANCELLED", inviteToken: null },
  });

  return NextResponse.json({ success: true, name: user.name });
}
