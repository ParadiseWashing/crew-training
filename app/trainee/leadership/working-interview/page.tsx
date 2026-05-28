import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { STATUS_LABELS } from "@/lib/working-interview";
import { NewInterviewButton } from "./new-interview-client";

export const dynamic = "force-dynamic";

const STATUS_TONE_CLASSES: Record<string, string> = {
  gray: "bg-gray-100 text-gray-700",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
};

function fmt(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function WorkingInterviewListPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { getUserPermissions } = await import("@/lib/permissions");
  const perms = await getUserPermissions(session.user.id);
  if (!perms.canAccessLeadership) notFound();

  const interviews = await prisma.workingInterview.findMany({
    orderBy: [{ status: "asc" }, { startedAt: "desc" }],
    include: {
      startedBy: { select: { id: true, name: true } },
      days: { orderBy: { day: "asc" }, select: { day: true, decision: true } },
    },
  });

  const inProgress = interviews.filter((i) => i.status === "IN_PROGRESS");
  const completed = interviews.filter((i) => i.status !== "IN_PROGRESS");

  return (
    <div className="space-y-6">
      <Link
        href="/trainee/leadership"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Leadership
      </Link>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Three Day Working Interview</h1>
          <p className="text-sm text-gray-500 mt-1">
            One form per day for each candidate. Disqualify on any day to end the trial.
          </p>
        </div>
        <NewInterviewButton />
      </div>

      {interviews.length === 0 && (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-gray-900 mb-1">No working interviews yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Start a new working interview when a candidate shows up for Day 1.
              </p>
              <NewInterviewButton />
            </div>
          </CardContent>
        </Card>
      )}

      {inProgress.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">In Progress</h2>
          <div className="space-y-2">
            {inProgress.map((interview) => (
              <InterviewRow key={interview.id} interview={interview} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Completed</h2>
          <div className="space-y-2">
            {completed.map((interview) => (
              <InterviewRow key={interview.id} interview={interview} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InterviewRow({
  interview,
}: {
  interview: {
    id: string;
    candidateName: string;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
    startedBy: { name: string };
    days: { day: number; decision: string }[];
  };
}) {
  const status = STATUS_LABELS[interview.status as keyof typeof STATUS_LABELS] ?? STATUS_LABELS.IN_PROGRESS;
  const nextDay = interview.status === "IN_PROGRESS" ? (interview.days.length + 1) : null;

  return (
    <Link href={`/trainee/leadership/working-interview/${interview.id}`} className="block group">
      <Card className="hover:border-accent-soft hover:shadow-sm transition-all">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-accent transition-colors">
                  {interview.candidateName}
                </p>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_TONE_CLASSES[status.tone]}`}
                >
                  {status.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Started {fmt(interview.startedAt)} · by {interview.startedBy.name}
                {interview.completedAt && ` · Closed ${fmt(interview.completedAt)}`}
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-1.5">
              {[1, 2, 3].map((d) => {
                const submitted = interview.days.find((day) => day.day === d);
                const tone = submitted
                  ? ["DQ", "DO_NOT_HIRE"].includes(submitted.decision)
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
                  : d === nextDay
                    ? "bg-accent-soft text-accent-hover ring-1 ring-accent-soft"
                    : "bg-gray-100 text-gray-400";
                return (
                  <span
                    key={d}
                    className={`text-[10px] font-bold w-7 h-7 rounded-full flex items-center justify-center ${tone}`}
                    title={submitted ? `Day ${d}: ${submitted.decision}` : d === nextDay ? `Day ${d}: next up` : `Day ${d}: not started`}
                  >
                    D{d}
                  </span>
                );
              })}
            </div>

            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-accent transition-colors flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
