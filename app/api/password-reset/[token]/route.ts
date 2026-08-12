import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashResetToken } from "@/lib/password-reset";

const INVALID = "This reset link is invalid or has expired.";

async function findUserByResetToken(token: string) {
  return prisma.user.findUnique({
    where: { passwordResetTokenHash: hashResetToken(token) },
    select: {
      id: true,
      name: true,
      email: true,
      inviteStatus: true,
      passwordResetExpiresAt: true,
    },
  });
}

function isUsable(user: Awaited<ReturnType<typeof findUserByResetToken>>) {
  if (!user) return false;
  if (user.inviteStatus === "CANCELLED") return false;
  if (!user.passwordResetExpiresAt) return false;
  return user.passwordResetExpiresAt.getTime() > Date.now();
}

// GET — validate the token and return who it belongs to
export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await findUserByResetToken(token);

  if (!isUsable(user)) {
    return NextResponse.json({ error: INVALID }, { status: 404 });
  }

  return NextResponse.json({ name: user!.name, email: user!.email });
}

// POST — consume the token and set a new password
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { password } = await req.json().catch(() => ({}));

  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const user = await findUserByResetToken(token);

  if (!isUsable(user)) {
    return NextResponse.json({ error: INVALID }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Someone who was invited but never activated can land here too — clicking
  // the emailed link proves they own the inbox, so finish activating them.
  const activating = user!.inviteStatus === "PENDING";

  await prisma.user.update({
    where: { id: user!.id },
    data: {
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      ...(activating
        ? {
            inviteStatus: "ACCEPTED" as const,
            inviteToken: null,
            activatedAt: new Date(),
            emailVerified: new Date(),
          }
        : {}),
    },
  });

  return NextResponse.json({ success: true, email: user!.email });
}
