import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── GET /api/weekly-signoffs ────────────────────────────────────────────────
// Returns sign-offs. Filters: ?traineeId, ?subjectId, ?weekNumber.
// Admins see all. Trainers (canSignOffTraining) see all. Trainees see their own.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const traineeId = searchParams.get("traineeId") ?? undefined;
  const subjectId = searchParams.get("subjectId") ?? undefined;
  const weekStr = searchParams.get("weekNumber");
  const weekNumber = weekStr ? parseInt(weekStr, 10) : undefined;

  const { getUserPermissions } = await import("@/lib/permissions");
  const perms = await getUserPermissions(session.user.id);
  const canSeeAll = perms.canSignOffTraining;

  const where: Record<string, unknown> = {};
  if (traineeId) where.traineeUserId = traineeId;
  if (subjectId) where.subjectId = subjectId;
  if (weekNumber !== undefined) where.weekNumber = weekNumber;
  if (!canSeeAll) {
    // Trainee only sees their own
    where.traineeUserId = session.user.id;
  }

  const rows = await prisma.weeklySignOff.findMany({
    where,
    include: {
      trainee: { select: { id: true, name: true, email: true } },
      trainer: { select: { id: true, name: true, email: true } },
      subject: { select: { id: true, title: true } },
    },
    orderBy: [{ signedAt: "desc" }],
  });

  return NextResponse.json(rows);
}

// ─── POST /api/weekly-signoffs ───────────────────────────────────────────────
// Trainer-only. Creates or upserts a weekly sign-off.
// Body: { subjectId, weekNumber, traineeUserId, decision, topicRatings, notes?, trainerSignedName }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Require trainer permission OR admin
  const { getUserPermissions } = await import("@/lib/permissions");
  const perms2 = await getUserPermissions(session.user.id);
  if (!perms2.canSignOffTraining) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    subjectId,
    weekNumber,
    traineeUserId,
    decision,
    topicRatings,
    notes,
    trainerSignedName,
  } = body as {
    subjectId: string;
    weekNumber: number;
    traineeUserId: string;
    decision: "PASSED" | "FAILED";
    topicRatings: Record<string, "PASS" | "NEEDS_WORK">;
    notes?: string;
    trainerSignedName: string;
  };

  // Basic validation
  if (!subjectId || typeof weekNumber !== "number" || !traineeUserId) {
    return NextResponse.json(
      { error: "subjectId, weekNumber, traineeUserId required" },
      { status: 400 }
    );
  }
  if (decision !== "PASSED" && decision !== "FAILED") {
    return NextResponse.json({ error: "decision must be PASSED or FAILED" }, { status: 400 });
  }
  if (!trainerSignedName?.trim()) {
    return NextResponse.json(
      { error: "trainerSignedName required (trainer signature)" },
      { status: 400 }
    );
  }
  if (!topicRatings || typeof topicRatings !== "object") {
    return NextResponse.json({ error: "topicRatings required" }, { status: 400 });
  }

  // Verify the week actually has topics
  const weekTopicCount = await prisma.topic.count({
    where: { subjectId, weekNumber },
  });
  if (weekTopicCount === 0) {
    return NextResponse.json(
      { error: `No topics found for week ${weekNumber} in this subject` },
      { status: 400 }
    );
  }

  const upserted = await prisma.weeklySignOff.upsert({
    where: {
      subjectId_weekNumber_traineeUserId: {
        subjectId,
        weekNumber,
        traineeUserId,
      },
    },
    create: {
      subjectId,
      weekNumber,
      traineeUserId,
      trainerUserId: session.user.id,
      decision,
      topicRatings,
      notes: notes?.trim() || null,
      trainerSignedName: trainerSignedName.trim(),
    },
    update: {
      trainerUserId: session.user.id,
      decision,
      topicRatings,
      notes: notes?.trim() || null,
      trainerSignedName: trainerSignedName.trim(),
    },
    include: {
      trainee: { select: { id: true, name: true } },
      trainer: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(upserted, { status: 201 });
}
