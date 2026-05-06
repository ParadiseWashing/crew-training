import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function buildBaseUrl(host: string | null, proto: string | null): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const scheme = proto === "http" ? "http" : "https";
  return host ? `${scheme}://${host}` : "https://crew-training.vercel.app";
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const h = await headers();
  const baseUrl = buildBaseUrl(h.get("host"), h.get("x-forwarded-proto"));

  const users = await prisma.user.findMany({
    where: { inviteStatus: "PENDING", inviteToken: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      inviteToken: true,
      inviteExpires: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      inviteUrl: `${baseUrl}/invite/${u.inviteToken}`,
      inviteExpires: u.inviteExpires?.toISOString() ?? null,
    }))
  );
}
