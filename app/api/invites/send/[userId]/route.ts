import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";

function buildBaseUrl(host: string | null, proto: string | null): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const scheme = proto === "http" ? "http" : "https";
  return host ? `${scheme}://${host}` : "https://paradiseacademy.vercel.app";
}

// POST /api/invites/send/[userId]
// Sends (or re-sends) an invite email to one specific user. Admin-only. Works
// for users who are still PENDING as well as those whose invite was CANCELLED —
// in the cancelled case a fresh token is generated and the user is set back to
// PENDING. Only ACCEPTED (already activated) users are rejected.
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
    select: {
      id: true,
      name: true,
      email: true,
      inviteToken: true,
      inviteStatus: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.inviteStatus === "ACCEPTED") {
    return NextResponse.json(
      { error: "This user has already activated their account." },
      { status: 400 }
    );
  }

  // Ensure the user has a valid pending invite. If their invite was cancelled
  // (token cleared), regenerate one and flip them back to PENDING.
  let inviteToken = user.inviteToken;
  if (user.inviteStatus !== "PENDING" || !inviteToken) {
    inviteToken = randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: { inviteToken, inviteStatus: "PENDING", invitedAt: new Date() },
    });
  }

  const h = await headers();
  const baseUrl = buildBaseUrl(h.get("host"), h.get("x-forwarded-proto"));

  const result = await sendInviteEmail({
    recipientName: user.name,
    recipientEmail: user.email,
    inviteUrl: `${baseUrl}/invite/${inviteToken}`,
  });

  const emailEnabled = process.env.EMAIL_ENABLED === "true";

  return NextResponse.json({
    sent: result.sent,
    emailEnabled,
    recipient: { name: user.name, email: user.email },
  });
}
