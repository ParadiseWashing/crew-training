import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  AUTO_DQ_FLAGS,
  DAY_1_TASKS,
  OBSERVATIONS,
  NONE_OF_ABOVE_CODE,
  hasRealDqFlag,
} from "@/lib/working-interview";

async function requireLeadershipAccess() {
  const session = await auth();
  if (!session) return { error: "Unauthorized", status: 401 as const };
  const { getUserPermissions } = await import("@/lib/permissions");
  const perms = await getUserPermissions(session.user.id);
  if (!perms.canAccessLeadership) {
    return { error: "Forbidden", status: 403 as const };
  }
  return { session };
}

const PASS_DECISIONS = new Set(["CONTINUE", "HIRE"]);
const FAIL_DECISIONS = new Set(["DQ", "DO_NOT_HIRE"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ interviewId: string; day: string }> }
) {
  const guard = await requireLeadershipAccess();
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { interviewId, day: dayStr } = await params;
  const day = parseInt(dayStr, 10);
  if (![1, 2, 3].includes(day)) {
    return NextResponse.json({ error: "Day must be 1, 2, or 3" }, { status: 400 });
  }

  const interview = await prisma.workingInterview.findUnique({
    where: { id: interviewId },
    include: { days: { select: { day: true, decision: true } } },
  });
  if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

  // Cannot submit a day if interview is closed.
  if (interview.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Interview is closed" }, { status: 400 });
  }

  // Sequencing: previous day must exist AND have a passing decision.
  if (day > 1) {
    const prev = interview.days.find((d) => d.day === day - 1);
    if (!prev) {
      return NextResponse.json({ error: `Day ${day - 1} must be submitted first` }, { status: 400 });
    }
    if (!PASS_DECISIONS.has(prev.decision)) {
      return NextResponse.json({ error: `Day ${day - 1} ended in DQ — interview should be closed` }, { status: 400 });
    }
  }

  // Cannot re-submit a day.
  if (interview.days.some((d) => d.day === day)) {
    return NextResponse.json({ error: `Day ${day} already submitted` }, { status: 400 });
  }

  const body = await req.json();
  const { ratings, autoDqFlags, notes, decision } = body;

  if (!decision || typeof decision !== "string") {
    return NextResponse.json({ error: "Decision required" }, { status: 400 });
  }

  // Valid decision must match day (1/2: CONTINUE|DQ, 3: HIRE|DO_NOT_HIRE).
  const validForDay = day === 3 ? ["HIRE", "DO_NOT_HIRE"] : ["CONTINUE", "DQ"];
  if (!validForDay.includes(decision)) {
    return NextResponse.json({ error: `Decision must be one of ${validForDay.join(" / ")}` }, { status: 400 });
  }

  // ─── Auto-DQ section validation ─────────────────────────────────────────────
  // Crew lead must either confirm "None of the above" or select at least one
  // real DQ flag. Real DQ flag (anything other than NONE_OF_ABOVE) forces DQ.
  const validFlagCodes = new Set<string>([
    ...AUTO_DQ_FLAGS.map((f) => f.code),
    NONE_OF_ABOVE_CODE,
  ]);
  const flagsArray: string[] = Array.isArray(autoDqFlags)
    ? autoDqFlags.filter((f): f is string => typeof f === "string" && validFlagCodes.has(f))
    : [];
  if (flagsArray.length === 0) {
    return NextResponse.json(
      { error: "Auto-DQ section requires a selection (or \"None of the above\")" },
      { status: 400 }
    );
  }
  if (hasRealDqFlag(flagsArray) && PASS_DECISIONS.has(decision)) {
    return NextResponse.json({ error: "Auto-DQ flags require a DQ decision" }, { status: 400 });
  }

  // ─── Required-field validation (matches the client) ────────────────────────
  const ratingsObj = (ratings && typeof ratings === "object") ? (ratings as Record<string, unknown>) : {};
  const tasks = (ratingsObj.tasks && typeof ratingsObj.tasks === "object") ? (ratingsObj.tasks as Record<string, string>) : {};
  const obs = (ratingsObj.observations && typeof ratingsObj.observations === "object") ? (ratingsObj.observations as Record<string, string>) : {};

  const isNonEmpty = (v: unknown): v is string => typeof v === "string" && v.length > 0;

  const missing: string[] = [];

  if (day === 1 || day === 2) {
    for (const task of DAY_1_TASKS) {
      if (!isNonEmpty(tasks[task.id])) missing.push(`task:${task.id}`);
    }
  }
  if (day === 2 && !isNonEmpty(ratingsObj.paceAtSpeed as string | undefined)) {
    missing.push("paceAtSpeed");
  }
  if (day === 3) {
    if (typeof ratingsObj.ownerVisitConfirmed !== "boolean") missing.push("ownerVisitConfirmed");
    if (!isNonEmpty(ratingsObj.productionSpeed as string | undefined)) missing.push("productionSpeed");
    if (!isNonEmpty(ratingsObj.qualityAtSpeed as string | undefined)) missing.push("qualityAtSpeed");
  }
  for (const o of OBSERVATIONS) {
    if (!isNonEmpty(obs[o.id])) missing.push(`obs:${o.id}`);
  }

  if (missing.length > 0) {
    return NextResponse.json(
      { error: "Required fields missing", missing },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const dayReport = await tx.workingInterviewDay.create({
      data: {
        interviewId,
        day,
        evaluatorId: guard.session.user.id,
        ratings: ratings ?? {},
        autoDqFlags: flagsArray,
        notes: typeof notes === "string" && notes.trim().length > 0 ? notes.trim() : null,
        decision: decision as "CONTINUE" | "DQ" | "HIRE" | "DO_NOT_HIRE",
      },
    });

    // Update the parent interview status based on this day's outcome.
    let newStatus: "IN_PROGRESS" | "PASSED" | "DISQUALIFIED" = "IN_PROGRESS";
    let completedAt: Date | null = null;
    if (FAIL_DECISIONS.has(decision)) {
      newStatus = "DISQUALIFIED";
      completedAt = new Date();
    } else if (day === 3 && decision === "HIRE") {
      newStatus = "PASSED";
      completedAt = new Date();
    }
    if (newStatus !== "IN_PROGRESS") {
      await tx.workingInterview.update({
        where: { id: interviewId },
        data: { status: newStatus, completedAt },
      });
    }

    return dayReport;
  });

  return NextResponse.json(result, { status: 201 });
}
