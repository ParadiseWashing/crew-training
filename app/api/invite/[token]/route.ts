import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET — validate the token and return the recipient's name/email
export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const user = await prisma.user.findUnique({
    where: { inviteToken: token },
    select: { name: true, email: true, inviteStatus: true, inviteExpires: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }
  if (user.inviteStatus === "ACCEPTED") {
    return NextResponse.json({ error: "This invite has already been used" }, { status: 410 });
  }
  if (user.inviteExpires && user.inviteExpires < new Date()) {
    return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
  }

  return NextResponse.json({ name: user.name, email: user.email });
}

// POST — accept the invite by setting a password
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { password } = await req.json().catch(() => ({}));

  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { inviteToken: token },
    select: { id: true, inviteStatus: true, inviteExpires: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }
  if (user.inviteStatus === "ACCEPTED") {
    return NextResponse.json({ error: "This invite has already been used" }, { status: 410 });
  }
  if (user.inviteExpires && user.inviteExpires < new Date()) {
    return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      inviteStatus: "ACCEPTED",
      inviteToken: null,
      inviteExpires: null,
      emailVerified: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
