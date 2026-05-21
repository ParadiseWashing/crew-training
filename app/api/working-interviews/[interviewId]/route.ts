import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireLeadershipAccess() {
  const session = await auth();
  if (!session) return { error: "Unauthorized", status: 401 as const };
  if (session.user.systemRole === "ADMIN") return { session, isAdmin: true };
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { jobRole: { select: { canAccessLeadership: true } } },
  });
  if (!user?.jobRole?.canAccessLeadership) {
    return { error: "Forbidden", status: 403 as const };
  }
  return { session, isAdmin: false };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  const guard = await requireLeadershipAccess();
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { interviewId } = await params;

  const interview = await prisma.workingInterview.findUnique({
    where: { id: interviewId },
    include: {
      startedBy: { select: { id: true, name: true } },
      days: {
        orderBy: { day: "asc" },
        include: { evaluator: { select: { id: true, name: true } } },
      },
    },
  });

  if (!interview) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(interview);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  // Admin-only: hard-delete an interview. (Crew leads cannot delete.)
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { interviewId } = await params;
  await prisma.workingInterview.delete({ where: { id: interviewId } });
  return NextResponse.json({ success: true });
}
