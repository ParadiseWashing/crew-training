import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";

function buildBaseUrl(host: string | null, proto: string | null): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const scheme = proto === "http" ? "http" : "https";
  return host ? `${scheme}://${host}` : "https://paradiseacademy.vercel.app";
}

export async function POST() {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const h = await headers();
  const baseUrl = buildBaseUrl(h.get("host"), h.get("x-forwarded-proto"));

  const pending = await prisma.user.findMany({
    where: { inviteStatus: "PENDING", inviteToken: { not: null } },
    select: { id: true, name: true, email: true, inviteToken: true },
  });

  let sent = 0;
  let failed = 0;
  for (const user of pending) {
    const result = await sendInviteEmail({
      recipientName: user.name,
      recipientEmail: user.email,
      inviteUrl: `${baseUrl}/invite/${user.inviteToken}`,
    });
    if (result.sent) sent++;
    else failed++;
  }

  const emailEnabled = process.env.EMAIL_ENABLED === "true";

  return NextResponse.json({
    attempted: pending.length,
    sent,
    failed,
    emailEnabled,
  });
}
