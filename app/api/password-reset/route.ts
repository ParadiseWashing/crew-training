import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import {
  generateResetToken,
  RESET_RESEND_COOLDOWN_MS,
  RESET_TOKEN_TTL_MS,
} from "@/lib/password-reset";

function buildBaseUrl(host: string | null, proto: string | null): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const scheme = proto === "http" ? "http" : "https";
  return host ? `${scheme}://${host}` : "https://paradiseacademy.vercel.app";
}

// POST /api/password-reset — request a reset link.
//
// Always responds with the same generic success payload, whether or not the
// email belongs to a real account. Anything else would let an anonymous caller
// enumerate who works here.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";

  const genericResponse = NextResponse.json({ success: true });

  if (!rawEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Login matches email exactly, but people don't type their address
  // consistently — match loosely here and use the stored address downstream.
  const user = await prisma.user.findFirst({
    where: { email: { equals: rawEmail, mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      email: true,
      inviteStatus: true,
      passwordResetExpiresAt: true,
    },
  });

  // A cancelled invite means access was deliberately revoked — a reset link
  // must not become a way back in.
  if (!user || user.inviteStatus === "CANCELLED") {
    return genericResponse;
  }

  // Throttle repeat requests so nobody can flood an inbox by mashing submit.
  if (user.passwordResetExpiresAt) {
    const issuedAt = user.passwordResetExpiresAt.getTime() - RESET_TOKEN_TTL_MS;
    if (Date.now() - issuedAt < RESET_RESEND_COOLDOWN_MS) {
      return genericResponse;
    }
  }

  const { token, tokenHash } = generateResetToken();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const h = await headers();
  const baseUrl = buildBaseUrl(h.get("host"), h.get("x-forwarded-proto"));

  await sendPasswordResetEmail({
    recipientName: user.name,
    recipientEmail: user.email,
    resetUrl: `${baseUrl}/reset-password/${token}`,
    expiresInMinutes: Math.round(RESET_TOKEN_TTL_MS / 60000),
  });

  return genericResponse;
}
