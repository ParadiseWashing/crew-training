import { prisma } from "@/lib/prisma";

export type ActivityType =
  | "STEP_COMPLETED"
  | "QUIZ_ATTEMPT"
  | "SUBJECT_SIGNOFF"
  | "WEEKLY_SIGNOFF"
  | "HANDBOOK_SIGNED"
  | "WORKING_INTERVIEW"
  | "AUDIT_FLAG"
  | "ASSIGNMENT"
  | "USER_JOINED"
  | "ADMIN_ACTION";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  /** ISO timestamp. */
  at: string;
  /** Who the event is about (usually the trainee). */
  personId: string | null;
  personName: string;
  title: string;
  detail?: string;
  href?: string;
  tone: "neutral" | "good" | "bad" | "warn";
}

const PER_SOURCE = 200;

/**
 * Builds a merged, reverse-chronological timeline across every entity that
 * records a dated event. Each source is capped so one noisy table can't crowd
 * out the rest; the merged list is then trimmed to `limit`.
 */
export async function getActivityFeed(limit = 400): Promise<ActivityEvent[]> {
  const [
    steps,
    attempts,
    signOffs,
    weekly,
    handbook,
    interviewDays,
    flags,
    assignments,
    users,
    adminActions,
  ] = await Promise.all([
    prisma.stepProgress.findMany({
      take: PER_SOURCE,
      orderBy: { completedAt: "desc" },
      include: {
        user: { select: { id: true, name: true } },
        step: {
          select: {
            id: true,
            title: true,
            topic: { select: { title: true, subject: { select: { id: true, title: true } } } },
          },
        },
      },
    }),
    prisma.quizAttempt.findMany({
      take: PER_SOURCE,
      orderBy: { takenAt: "desc" },
      include: {
        user: { select: { id: true, name: true } },
        quiz: {
          select: {
            id: true,
            topic: { select: { title: true, subject: { select: { id: true, title: true } } } },
          },
        },
      },
    }),
    prisma.signOff.findMany({
      take: PER_SOURCE,
      orderBy: { signedAt: "desc" },
      include: {
        user: { select: { id: true, name: true } },
        subject: { select: { id: true, title: true } },
      },
    }),
    prisma.weeklySignOff.findMany({
      take: PER_SOURCE,
      orderBy: { signedAt: "desc" },
      include: {
        trainee: { select: { id: true, name: true } },
        trainer: { select: { id: true, name: true } },
        subject: { select: { id: true, title: true } },
      },
    }),
    prisma.handbookSignature.findMany({
      take: PER_SOURCE,
      orderBy: { signedAt: "desc" },
      select: {
        id: true,
        signedAt: true,
        printedName: true,
        user: { select: { id: true, name: true } },
        step: { select: { title: true } },
      },
    }),
    prisma.workingInterviewDay.findMany({
      take: PER_SOURCE,
      orderBy: { submittedAt: "desc" },
      include: {
        interview: { select: { id: true, candidateName: true } },
        evaluator: { select: { id: true, name: true } },
      },
    }),
    prisma.trainingAuditFlag.findMany({
      take: PER_SOURCE,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.assignment.findMany({
      take: PER_SOURCE,
      orderBy: { assignedAt: "desc" },
      include: {
        user: { select: { id: true, name: true } },
        subject: { select: { id: true, title: true } },
      },
    }),
    prisma.user.findMany({
      take: PER_SOURCE,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, createdAt: true, activatedAt: true, inviteStatus: true },
    }),
    prisma.adminAuditLog.findMany({
      take: PER_SOURCE,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const events: ActivityEvent[] = [];

  for (const s of steps) {
    events.push({
      id: `step-${s.id}`,
      type: "STEP_COMPLETED",
      at: s.completedAt.toISOString(),
      personId: s.user.id,
      personName: s.user.name,
      title: `Completed "${s.step.title}"`,
      detail: `${s.step.topic.subject.title} · ${s.step.topic.title}`,
      href: `/admin/people/${s.user.id}`,
      tone: "neutral",
    });
  }

  for (const a of attempts) {
    events.push({
      id: `quiz-${a.id}`,
      type: "QUIZ_ATTEMPT",
      at: a.takenAt.toISOString(),
      personId: a.user.id,
      personName: a.user.name,
      title: `${a.passed ? "Passed" : "Failed"} quiz — ${Math.round(a.score)}% (attempt ${a.attemptNum})`,
      detail: `${a.quiz.topic.subject.title} · ${a.quiz.topic.title}`,
      href: `/admin/people/${a.user.id}`,
      tone: a.passed ? "good" : "bad",
    });
  }

  for (const s of signOffs) {
    events.push({
      id: `signoff-${s.id}`,
      type: "SUBJECT_SIGNOFF",
      at: s.signedAt.toISOString(),
      personId: s.user.id,
      personName: s.user.name,
      title: `Signed off on "${s.subject.title}"`,
      detail: `Signed as ${s.signedName}`,
      href: `/admin/people/${s.user.id}`,
      tone: "good",
    });
  }

  for (const w of weekly) {
    events.push({
      id: `weekly-${w.id}`,
      type: "WEEKLY_SIGNOFF",
      at: w.signedAt.toISOString(),
      personId: w.trainee.id,
      personName: w.trainee.name,
      title: `Week ${w.weekNumber} sign-off — ${w.decision === "PASSED" ? "Passed" : "Failed"}`,
      detail: `${w.subject.title} · trainer ${w.trainer.name}`,
      href: `/admin/reports/weekly-signoffs`,
      tone: w.decision === "PASSED" ? "good" : "bad",
    });
  }

  for (const h of handbook) {
    events.push({
      id: `handbook-${h.id}`,
      type: "HANDBOOK_SIGNED",
      at: h.signedAt.toISOString(),
      personId: h.user.id,
      personName: h.user.name,
      title: `Signed "${h.step.title}"`,
      detail: `Printed name: ${h.printedName}`,
      href: `/admin/people/${h.user.id}`,
      tone: "good",
    });
  }

  for (const d of interviewDays) {
    events.push({
      id: `widay-${d.id}`,
      type: "WORKING_INTERVIEW",
      at: d.submittedAt.toISOString(),
      personId: d.evaluator.id,
      personName: d.evaluator.name,
      title: `Working interview day ${d.day} submitted — ${d.decision.replace(/_/g, " ").toLowerCase()}`,
      detail: `Candidate: ${d.interview.candidateName}`,
      href: `/admin/reports/working-interviews/${d.interview.id}`,
      tone: d.decision === "DQ" || d.decision === "DO_NOT_HIRE" ? "bad" : "good",
    });
  }

  for (const f of flags) {
    events.push({
      id: `flag-${f.id}`,
      type: "AUDIT_FLAG",
      at: f.createdAt.toISOString(),
      personId: f.user.id,
      personName: f.user.name,
      title: `Audit flag raised — ${f.flagType.replace(/_/g, " ").toLowerCase()}`,
      detail: f.dismissed ? "Dismissed" : "Awaiting review",
      href: "/admin/reports/flags",
      tone: f.dismissed ? "neutral" : "warn",
    });
  }

  for (const a of assignments) {
    events.push({
      id: `assign-${a.id}`,
      type: "ASSIGNMENT",
      at: a.assignedAt.toISOString(),
      personId: a.user.id,
      personName: a.user.name,
      title: `Assigned "${a.subject.title}"`,
      detail: a.dueDate ? `Due ${a.dueDate.toLocaleDateString("en-US")}` : undefined,
      href: `/admin/people/${a.user.id}`,
      tone: "neutral",
    });
  }

  for (const u of users) {
    events.push({
      id: `user-${u.id}`,
      type: "USER_JOINED",
      at: (u.activatedAt ?? u.createdAt).toISOString(),
      personId: u.id,
      personName: u.name,
      title: u.activatedAt ? "Activated their account" : "Added to the roster",
      detail: u.inviteStatus === "PENDING" ? "Invite still pending" : undefined,
      href: `/admin/people/${u.id}`,
      tone: "neutral",
    });
  }

  for (const l of adminActions) {
    events.push({
      id: `admin-${l.id}`,
      type: "ADMIN_ACTION",
      at: l.createdAt.toISOString(),
      personId: l.actorId,
      personName: l.actorName,
      title: l.action.replace(/_/g, " ").toLowerCase(),
      detail: l.summary,
      tone: l.action.startsWith("DELETE") || l.action.startsWith("RESET") ? "warn" : "neutral",
    });
  }

  events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return events.slice(0, limit);
}
