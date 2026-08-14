import Link from "next/link";
import { notFound } from "next/navigation";
import { PenSquare } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Breadcrumb } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  AUTO_DQ_FLAGS,
  LEGACY_DAY_TASKS,
  OBSERVATIONS,
  PRODUCTION_SPEED_OPTIONS,
  QUALITY_AT_SPEED_OPTIONS,
  STATUS_LABELS,
  NONE_OF_ABOVE_CODE,
  displayRating,
  ratingTone,
  type ServiceRating,
} from "@/lib/working-interview";
import { DeleteInterviewButton } from "./delete-interview-client";
import { DeleteDayButton } from "./delete-day-client";

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

const RATING_TONE_CLASSES: Record<string, string> = {
  green: "text-emerald-700",
  amber: "text-amber-700",
  red: "text-red-700",
  gray: "text-gray-400",
};

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
        actions={
          <>
            {/* The day form lives in the leadership section — admins pass the
                same permission check, so link straight into it. */}
            {interview.status === "IN_PROGRESS" && (
              <Link
                href={`/trainee/leadership/working-interview/${interview.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E4DE] bg-white px-3 py-2 text-sm font-medium text-[#34302C] hover:bg-[#F7F5F2] transition-colors"
              >
                <PenSquare className="h-4 w-4" />
                Fill out day report
              </Link>
            )}
            <DeleteInterviewButton
              interviewId={interview.id}
              candidateName={interview.candidateName}
              dayCount={interview.days.length}
            />
          </>
        }
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
            <div className="py-6 text-center">
              <p className="text-sm text-gray-500">No day reports have been submitted yet.</p>
              <Link
                href={`/trainee/leadership/working-interview/${interview.id}`}
                className="text-sm font-medium text-accent hover:underline mt-1 inline-block"
              >
                Fill out the Day 1 report →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {interview.days.map((d, idx) => {
          const isLastDay = idx === interview.days.length - 1;
          const ratings = (d.ratings as Record<string, unknown>) ?? {};
          const obs = (ratings.observations as Record<string, string>) ?? {};
          // Current reports store a lead-selected `services` array. Reports
          // submitted before that change stored a fixed `tasks` map instead —
          // fall back to it so historical records still render.
          const services: ServiceRating[] = Array.isArray(ratings.services)
            ? (ratings.services as ServiceRating[])
            : [];
          const legacyTasks = (ratings.tasks as Record<string, string>) ?? {};
          const hasLegacyTasks = services.length === 0 && Object.keys(legacyTasks).length > 0;
          const flagCodes: string[] = Array.isArray(d.autoDqFlags) ? (d.autoDqFlags as string[]) : [];
          // Don't surface NONE_OF_ABOVE in the "Auto-DQ Flags Triggered" warning —
          // it's the safe-answer code, not a triggered disqualifier.
          const flags: string[] = flagCodes
            .filter((code) => code !== NONE_OF_ABOVE_CODE)
            .map((code) => AUTO_DQ_FLAGS.find((f) => f.code === code)?.label ?? code);
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
                  <div className="flex items-center gap-3">
                    <DeleteDayButton
                      interviewId={interview.id}
                      candidateName={interview.candidateName}
                      day={d.day}
                      isLastDay={isLastDay}
                    />
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${decisionTone}`}>
                      {decisionLabel(d.decision)}
                    </span>
                  </div>
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

                {/* Services worked (Day 1 + 2) */}
                {(d.day === 1 || d.day === 2) && (services.length > 0 || hasLegacyTasks) && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                      {d.day === 2 ? "Service Retention" : "Service Performance"}
                      {hasLegacyTasks && (
                        <span className="ml-2 normal-case tracking-normal font-normal text-gray-400">
                          (legacy fixed task list)
                        </span>
                      )}
                    </p>
                    <div className="grid sm:grid-cols-3 gap-2">
                      {(hasLegacyTasks
                        ? LEGACY_DAY_TASKS.map((t) => ({
                            id: t.id,
                            label: t.label,
                            rating: legacyTasks[t.id],
                          }))
                        : services
                      ).map((row) => (
                        <div
                          key={row.id}
                          className="rounded-md border border-gray-200 px-3 py-2 bg-gray-50"
                        >
                          <p className="text-[11px] text-gray-500">{row.label}</p>
                          <p
                            className={`text-sm font-semibold mt-0.5 ${RATING_TONE_CLASSES[ratingTone(row.rating)]}`}
                          >
                            {displayRating(row.rating)}
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
                      {displayRating(ratings.paceAtSpeed as string)}
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
                          ? "Confirmed"
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
                        <p
                          className={`text-xs font-semibold ${RATING_TONE_CLASSES[ratingTone(obs[o.id])]}`}
                        >
                          {displayRating(obs[o.id])}
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
