import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";

function buildBaseUrl(host: string | null, proto: string | null): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const scheme = proto === "http" ? "http" : "https";
  return host ? `${scheme}://${host}` : "https://paradiseacademy.vercel.app";
}

// POST /api/invites/send/[userId]
// Sends an invite email to one specific user. Admin-only. The user must still
// be in PENDING status and have an inviteToken; otherwise this is a no-op error.
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
  if (user.inviteStatus !== "PENDING" || !user.inviteToken) {
    return NextResponse.json(
      { error: "This user has already accepted their invite or has no pending invite." },
      { status: 400 }
    );
  }

  const h = await headers();
  const baseUrl = buildBaseUrl(h.get("host"), h.get("x-forwarded-proto"));

  const result = await sendInviteEmail({
    recipientName: user.name,
    recipientEmail: user.email,
    inviteUrl: `${baseUrl}/invite/${user.inviteToken}`,
  });

  const emailEnabled = process.env.EMAIL_ENABLED === "true";

  return NextResponse.json({
    sent: result.sent,
    emailEnabled,
    recipient: { name: user.name, email: user.email },
  });
}
