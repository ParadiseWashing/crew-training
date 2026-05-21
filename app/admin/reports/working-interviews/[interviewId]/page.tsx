import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Breadcrumb } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  AUTO_DQ_FLAGS,
  DAY_1_TASKS,
  OBSERVATIONS,
  RATING_OPTIONS,
  RETENTION_OPTIONS,
  PRODUCTION_SPEED_OPTIONS,
  QUALITY_AT_SPEED_OPTIONS,
  STATUS_LABELS,
} from "@/lib/working-interview";

export const dynamic = "force-dynamic";

const STATUS_TONE_CLASSES: Record<string, string> = {
  gray: "bg-gray-100 text-gray-700",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
};

const DAY_TITLES: Record<number, string> = {
  1: "Day 1 — Taught",
  2: "Day 2 — Tested",
  3: "Day 3 — Produced",
};

function ratingLabel(value: string | undefined, day: number): string {
  if (!value) return "—";
  const pool = day === 2 ? RETENTION_OPTIONS : RATING_OPTIONS;
  return pool.find((o) => o.value === value)?.label ?? value;
}

function obsLabel(value: string | undefined): string {
  if (!value) return "—";
  return RATING_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function speedLabel(value: string | undefined): string {
  if (!value) return "—";
  return PRODUCTION_SPEED_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function qualityLabel(value: string | undefined): string {
  if (!value) return "—";
  return QUALITY_AT_SPEED_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function decisionLabel(d: string): string {
  return d === "CONTINUE" ? "Continue"
    : d === "DQ" ? "DQ"
    : d === "HIRE" ? "Recommend Hire"
    : d === "DO_NOT_HIRE" ? "Do Not Hire"
    : d;
}

export default async function AdminInterviewDetailPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") notFound();

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
  if (!interview) notFound();

  const status = STATUS_LABELS[interview.status as keyof typeof STATUS_LABELS] ?? STATUS_LABELS.IN_PROGRESS;

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            items={[
              { label: "Reports", href: "/admin/reports" },
              { label: "Working Interviews", href: "/admin/reports/working-interviews" },
              { label: interview.candidateName },
            ]}
          />
        }
        title={interview.candidateName}
        description={`Started ${new Date(interview.startedAt).toLocaleDateString()} by ${interview.startedBy.name}`}
      />
      <div className="mb-6 -mt-2">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_TONE_CLASSES[status.tone]}`}
        >
          {status.label}
        </span>
      </div>

      {interview.days.length === 0 && (
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500 py-6 text-center">
              No day reports have been submitted yet.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {interview.days.map((d) => {
          const ratings = (d.ratings as Record<string, unknown>) ?? {};
          const tasks = (ratings.tasks as Record<string, string>) ?? {};
          const obs = (ratings.observations as Record<string, string>) ?? {};
          const flagCodes: string[] = Array.isArray(d.autoDqFlags) ? (d.autoDqFlags as string[]) : [];
          const flags: string[] = flagCodes.map(
            (code) => AUTO_DQ_FLAGS.find((f) => f.code === code)?.label ?? code
          );
          const decisionTone = ["CONTINUE", "HIRE"].includes(d.decision)
            ? "bg-emerald-100 text-emerald-700"
            : "bg-red-100 text-red-700";

          return (
            <Card key={d.id}>
              <CardContent className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-base font-bold text-gray-900">{DAY_TITLES[d.day]}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Submitted {new Date(d.submittedAt).toLocaleString()} by {d.evaluator.name}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${decisionTone}`}>
                    {decisionLabel(d.decision)}
                  </span>
                </div>

                {/* Auto-DQ flags (if any) */}
                {flags.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700 mb-1.5">
                      Auto-DQ Flags Triggered
                    </p>
                    <ul className="space-y-0.5">
                      {flags.map((f, i) => (
                        <li key={i} className="text-xs text-red-900">
                          • {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Task ratings (Day 1 + 2) */}
                {(d.day === 1 || d.day === 2) && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                      {d.day === 2 ? "Task Retention" : "Task Performance"}
                    </p>
                    <div className="grid sm:grid-cols-3 gap-2">
                      {DAY_1_TASKS.map((task) => (
                        <div
                          key={task.id}
                          className="rounded-md border border-gray-200 px-3 py-2 bg-gray-50"
                        >
                          <p className="text-[11px] text-gray-500">{task.label}</p>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">
                            {ratingLabel(tasks[task.id], d.day)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Day 2 pace */}
                {d.day === 2 && Boolean(ratings.paceAtSpeed) && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                      Pace at Speed
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {obsLabel(ratings.paceAtSpeed as string)}
                    </p>
                  </div>
                )}

                {/* Day 3 specifics */}
                {d.day === 3 && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-md border border-gray-200 px-3 py-2 bg-gray-50">
                      <p className="text-[11px] text-gray-500">Owner site visit</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {ratings.ownerVisitConfirmed === true
                          ? `Confirmed${ratings.ownerVisitTime ? ` (${String(ratings.ownerVisitTime)})` : ""}`
                          : ratings.ownerVisitConfirmed === false
                            ? "Did not happen"
                            : "—"}
                      </p>
                    </div>
                    <div className="rounded-md border border-gray-200 px-3 py-2 bg-gray-50">
                      <p className="text-[11px] text-gray-500">Production speed</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {speedLabel(ratings.productionSpeed as string)}
                      </p>
                    </div>
                    <div className="rounded-md border border-gray-200 px-3 py-2 bg-gray-50">
                      <p className="text-[11px] text-gray-500">Quality at speed</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {qualityLabel(ratings.qualityAtSpeed as string)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Observations (all days) */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                    General Observations
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {OBSERVATIONS.map((o) => (
                      <div
                        key={o.id}
                        className="rounded-md border border-gray-200 px-3 py-2 bg-gray-50 flex items-center justify-between gap-2"
                      >
                        <p className="text-[11px] text-gray-500">{o.label}</p>
                        <p className="text-xs font-semibold text-gray-900">
                          {obsLabel(obs[o.id])}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {d.notes && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                      Notes
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-md p-3 border border-gray-100">
                      {d.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
