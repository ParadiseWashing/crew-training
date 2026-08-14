import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  AUTO_DQ_FLAGS,
  OBSERVATIONS,
  NONE_OF_ABOVE_CODE,
  SERVICE_IDS,
  serviceLabel,
  isPassFail,
  hasRealDqFlag,
  type ServiceRating,
} from "@/lib/working-interview";
import { logAdminAction } from "@/lib/admin-audit";

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

type DayDecision = "CONTINUE" | "DQ" | "HIRE" | "DO_NOT_HIRE";

interface ValidatedDay {
  ratings: unknown;
  flagsArray: string[];
  notes: string | null;
  decision: DayDecision;
}

/**
 * Shared validation for both a first submission and an admin correction — a
 * corrected day must clear exactly the same bar as an original one.
 */
function validateDayPayload(
  day: number,
  body: Record<string, unknown>
): { error: string; status: 400; missing?: string[] } | ValidatedDay {
  const { ratings, autoDqFlags, notes, decision } = body as {
    ratings?: unknown;
    autoDqFlags?: unknown;
    notes?: unknown;
    decision?: unknown;
  };

  if (!decision || typeof decision !== "string") {
    return { error: "Decision required", status: 400 };
  }

  // Valid decision must match day (1/2: CONTINUE|DQ, 3: HIRE|DO_NOT_HIRE).
  const validForDay = day === 3 ? ["HIRE", "DO_NOT_HIRE"] : ["CONTINUE", "DQ"];
  if (!validForDay.includes(decision)) {
    return { error: `Decision must be one of ${validForDay.join(" / ")}`, status: 400 };
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
    return {
      error: 'Auto-DQ section requires a selection (or "None of the above")',
      status: 400,
    };
  }
  if (hasRealDqFlag(flagsArray) && PASS_DECISIONS.has(decision)) {
    return { error: "Auto-DQ flags require a DQ decision", status: 400 };
  }

  // ─── Required-field validation (matches the client) ────────────────────────
  const ratingsObj =
    ratings && typeof ratings === "object" ? (ratings as Record<string, unknown>) : {};
  const obs =
    ratingsObj.observations && typeof ratingsObj.observations === "object"
      ? (ratingsObj.observations as Record<string, string>)
      : {};

  const isNonEmpty = (v: unknown): v is string => typeof v === "string" && v.length > 0;

  const missing: string[] = [];

  // ─── Services (day 1 & 2) ───────────────────────────────────────────────────
  // The lead picks which services the candidate worked, so the list is variable.
  // Rebuild it server-side from the trusted catalogue rather than storing
  // whatever the client sent, and snapshot the label for historical reports.
  const services: ServiceRating[] = [];
  if (day === 1 || day === 2) {
    const raw = Array.isArray(ratingsObj.services) ? ratingsObj.services : [];
    const seen = new Set<string>();
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const { id, rating } = entry as { id?: unknown; rating?: unknown };
      if (typeof id !== "string" || !SERVICE_IDS.has(id)) {
        return { error: `Unknown service "${String(id)}"`, status: 400 };
      }
      if (seen.has(id)) continue; // ignore duplicates rather than double-counting
      seen.add(id);
      if (!isPassFail(rating)) {
        missing.push(`service:${id}`);
        continue;
      }
      services.push({ id, label: serviceLabel(id), rating });
    }
    if (raw.length === 0) missing.push("services");
  }

  if (day === 2 && !isPassFail(ratingsObj.paceAtSpeed)) {
    missing.push("paceAtSpeed");
  }
  if (day === 3) {
    if (typeof ratingsObj.ownerVisitConfirmed !== "boolean") missing.push("ownerVisitConfirmed");
    if (!isNonEmpty(ratingsObj.productionSpeed as string | undefined)) missing.push("productionSpeed");
    if (!isNonEmpty(ratingsObj.qualityAtSpeed as string | undefined)) missing.push("qualityAtSpeed");
  }
  for (const o of OBSERVATIONS) {
    if (!isPassFail(obs[o.id])) missing.push(`obs:${o.id}`);
  }

  if (missing.length > 0) {
    return { error: "Required fields missing", status: 400, missing };
  }

  // Store a normalised object so every report has the same shape regardless of
  // what the client posted.
  const cleanObs: Record<string, string> = {};
  for (const o of OBSERVATIONS) cleanObs[o.id] = obs[o.id];
  const normalisedRatings: Record<string, unknown> = { observations: cleanObs };
  if (day === 1 || day === 2) normalisedRatings.services = services;
  if (day === 2) normalisedRatings.paceAtSpeed = ratingsObj.paceAtSpeed;
  if (day === 3) {
    normalisedRatings.ownerVisitConfirmed = ratingsObj.ownerVisitConfirmed;
    normalisedRatings.productionSpeed = ratingsObj.productionSpeed;
    normalisedRatings.qualityAtSpeed = ratingsObj.qualityAtSpeed;
  }

  return {
    ratings: normalisedRatings,
    flagsArray,
    notes: typeof notes === "string" && notes.trim().length > 0 ? notes.trim() : null,
    decision: decision as DayDecision,
  };
}

/**
 * Derives the parent interview's status from the days that currently exist.
 * Used after a day is edited or removed, so the interview can reopen if the
 * disqualifying day was corrected or deleted.
 */
async function recomputeInterviewStatus(interviewId: string) {
  const days = await prisma.workingInterviewDay.findMany({
    where: { interviewId },
    orderBy: { day: "asc" },
    select: { day: true, decision: true, submittedAt: true },
  });

  const failing = days.find((d) => FAIL_DECISIONS.has(d.decision));
  const hired = days.find((d) => d.day === 3 && d.decision === "HIRE");

  let status: "IN_PROGRESS" | "PASSED" | "DISQUALIFIED" = "IN_PROGRESS";
  let completedAt: Date | null = null;
  if (failing) {
    status = "DISQUALIFIED";
    completedAt = failing.submittedAt;
  } else if (hired) {
    status = "PASSED";
    completedAt = hired.submittedAt;
  }

  await prisma.workingInterview.update({
    where: { id: interviewId },
    data: { status, completedAt },
  });

  return status;
}

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
  const validated = validateDayPayload(day, body);
  if ("error" in validated) {
    return NextResponse.json(
      validated.missing
        ? { error: validated.error, missing: validated.missing }
        : { error: validated.error },
      { status: validated.status }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const dayReport = await tx.workingInterviewDay.create({
      data: {
        interviewId,
        day,
        evaluatorId: guard.session.user.id,
        ratings: validated.ratings as never,
        autoDqFlags: validated.flagsArray,
        notes: validated.notes,
        decision: validated.decision,
      },
    });

    // Update the parent interview status based on this day's outcome.
    let newStatus: "IN_PROGRESS" | "PASSED" | "DISQUALIFIED" = "IN_PROGRESS";
    let completedAt: Date | null = null;
    if (FAIL_DECISIONS.has(validated.decision)) {
      newStatus = "DISQUALIFIED";
      completedAt = new Date();
    } else if (day === 3 && validated.decision === "HIRE") {
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

/**
 * PATCH — admin-only correction of an already-submitted day.
 *
 * Working interviews are hiring evidence, so the previous version of the record
 * is captured in the admin audit log before it is overwritten. Correcting a day
 * can reopen a closed interview (e.g. a DQ entered by mistake).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ interviewId: string; day: string }> }
) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { interviewId, day: dayStr } = await params;
  const day = parseInt(dayStr, 10);
  if (![1, 2, 3].includes(day)) {
    return NextResponse.json({ error: "Day must be 1, 2, or 3" }, { status: 400 });
  }

  const existing = await prisma.workingInterviewDay.findFirst({
    where: { interviewId, day },
    include: { interview: { select: { candidateName: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: `Day ${day} has not been submitted` }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const validated = validateDayPayload(day, body);
  if ("error" in validated) {
    return NextResponse.json(
      validated.missing
        ? { error: validated.error, missing: validated.missing }
        : { error: validated.error },
      { status: validated.status }
    );
  }

  const updated = await prisma.workingInterviewDay.update({
    where: { id: existing.id },
    data: {
      ratings: validated.ratings as never,
      autoDqFlags: validated.flagsArray,
      notes: validated.notes,
      decision: validated.decision,
    },
  });

  const status = await recomputeInterviewStatus(interviewId);

  await logAdminAction({
    actorId: session.user.id,
    actorName: session.user.name ?? "Admin",
    action: "EDIT_WORKING_INTERVIEW_DAY",
    entityType: "WorkingInterviewDay",
    entityId: existing.id,
    summary: `Corrected day ${day} for candidate ${existing.interview.candidateName} — decision ${existing.decision} → ${validated.decision}`,
    metadata: {
      interviewId,
      day,
      previous: {
        ratings: existing.ratings,
        autoDqFlags: existing.autoDqFlags,
        notes: existing.notes,
        decision: existing.decision,
        evaluatorId: existing.evaluatorId,
        submittedAt: existing.submittedAt.toISOString(),
      },
      interviewStatus: status,
    },
  });

  return NextResponse.json(updated);
}

/**
 * DELETE — admin-only removal of a submitted day so it can be re-entered.
 * The full record is preserved in the admin audit log.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ interviewId: string; day: string }> }
) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { interviewId, day: dayStr } = await params;
  const day = parseInt(dayStr, 10);
  if (![1, 2, 3].includes(day)) {
    return NextResponse.json({ error: "Day must be 1, 2, or 3" }, { status: 400 });
  }

  const existing = await prisma.workingInterviewDay.findFirst({
    where: { interviewId, day },
    include: {
      interview: { select: { candidateName: true } },
      evaluator: { select: { id: true, name: true } },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: `Day ${day} has not been submitted` }, { status: 404 });
  }

  // Days are sequential — removing one must not leave a later day orphaned.
  const laterDay = await prisma.workingInterviewDay.findFirst({
    where: { interviewId, day: { gt: day } },
    orderBy: { day: "asc" },
    select: { day: true },
  });
  if (laterDay) {
    return NextResponse.json(
      { error: `Delete day ${laterDay.day} first — days must be removed in reverse order.` },
      { status: 400 }
    );
  }

  await prisma.workingInterviewDay.delete({ where: { id: existing.id } });
  const status = await recomputeInterviewStatus(interviewId);

  await logAdminAction({
    actorId: session.user.id,
    actorName: session.user.name ?? "Admin",
    action: "DELETE_WORKING_INTERVIEW_DAY",
    entityType: "WorkingInterviewDay",
    entityId: existing.id,
    summary: `Deleted day ${day} for candidate ${existing.interview.candidateName} (was ${existing.decision}, evaluated by ${existing.evaluator.name})`,
    metadata: {
      interviewId,
      day,
      ratings: existing.ratings,
      autoDqFlags: existing.autoDqFlags,
      notes: existing.notes,
      decision: existing.decision,
      evaluatorId: existing.evaluatorId,
      submittedAt: existing.submittedAt.toISOString(),
      interviewStatus: status,
    },
  });

  return NextResponse.json({ success: true, interviewStatus: status });
}
