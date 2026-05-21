import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Guards: only admins OR users whose JobRole.canAccessLeadership === true can use these.
async function requireLeadershipAccess() {
  const session = await auth();
  if (!session) return { error: "Unauthorized", status: 401 as const };
  if (session.user.systemRole === "ADMIN") return { session };
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { jobRole: { select: { canAccessLeadership: true } } },
  });
  if (!user?.jobRole?.canAccessLeadership) {
    return { error: "Forbidden", status: 403 as const };
  }
  return { session };
}

export async function GET() {
  const guard = await requireLeadershipAccess();
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  // Crew leads see all interviews (visibility helps coordination across days).
  // Admin same. No per-user filtering for v1.
  const interviews = await prisma.workingInterview.findMany({
    orderBy: { startedAt: "desc" },
    include: {
      startedBy: { select: { id: true, name: true } },
      days: {
        orderBy: { day: "asc" },
        select: { day: true, decision: true, submittedAt: true, evaluator: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json({ interviews });
}

export async function POST(req: NextRequest) {
  const guard = await requireLeadershipAccess();
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json();
  const candidateName = String(body.candidateName ?? "").trim();
  if (!candidateName) {
    return NextResponse.json({ error: "Candidate name required" }, { status: 400 });
  }

  const interview = await prisma.workingInterview.create({
    data: {
      candidateName,
      startedById: guard.session.user.id,
    },
  });

  return NextResponse.json(interview, { status: 201 });
}
