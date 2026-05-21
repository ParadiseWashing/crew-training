import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader, Breadcrumb } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, ChevronRight, ArrowRight } from "lucide-react";
import { STATUS_LABELS } from "@/lib/working-interview";

export const dynamic = "force-dynamic";

const STATUS_TONE_CLASSES: Record<string, string> = {
  gray: "bg-gray-100 text-gray-700",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
};

function fmt(date: Date | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminWorkingInterviewsPage() {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") notFound();

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
    <div>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            items={[
              { label: "Reports", href: "/admin/reports" },
              { label: "Working Interviews" },
            ]}
          />
        }
        title="Working Interviews"
        description="3-day working interview reports submitted by crew leads."
      />

      {interviews.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <ClipboardCheck className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">No working interviews yet</p>
              <p className="text-sm text-gray-500">
                Once crew leads start interviews from the Leadership section, candidates appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {inProgress.length > 0 && (
            <Section title="In Progress" interviews={inProgress} />
          )}
          {completed.length > 0 && (
            <Section title="Completed" interviews={completed} />
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  interviews,
}: {
  title: string;
  interviews: {
    id: string;
    candidateName: string;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
    startedBy: { name: string };
    days: { day: number; decision: string }[];
  }[];
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h2>
      <Card>
        <CardContent className="p-0 divide-y divide-gray-100">
          {interviews.map((interview) => {
            const status = STATUS_LABELS[interview.status as keyof typeof STATUS_LABELS] ?? STATUS_LABELS.IN_PROGRESS;
            return (
              <Link
                key={interview.id}
                href={`/admin/reports/working-interviews/${interview.id}`}
                className="block group"
              >
                <div className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-3">
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
                        : "bg-gray-100 text-gray-400";
                      return (
                        <span
                          key={d}
                          className={`text-[10px] font-bold w-7 h-7 rounded-full flex items-center justify-center ${tone}`}
                          title={submitted ? `Day ${d}: ${submitted.decision}` : `Day ${d}: not yet`}
                        >
                          D{d}
                        </span>
                      );
                    })}
                  </div>

                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-accent transition-colors flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}
