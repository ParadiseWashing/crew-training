import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { STATUS_LABELS } from "@/lib/working-interview";
import { InterviewWorkflowClient } from "./workflow-client";

export const dynamic = "force-dynamic";

const STATUS_TONE_CLASSES: Record<string, string> = {
  gray: "bg-gray-100 text-gray-700",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
};

export default async function WorkingInterviewDetailPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { getUserPermissions } = await import("@/lib/permissions");
  const perms = await getUserPermissions(session.user.id);
  if (!perms.canAccessLeadership) notFound();

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

  // Serialize for client (Dates → strings, JSON unwrapped).
  const serialized = {
    id: interview.id,
    candidateName: interview.candidateName,
    status: interview.status as "IN_PROGRESS" | "PASSED" | "DISQUALIFIED",
    startedAt: interview.startedAt.toISOString(),
    completedAt: interview.completedAt?.toISOString() ?? null,
    startedBy: { id: interview.startedBy.id, name: interview.startedBy.name },
    days: interview.days.map((d) => ({
      id: d.id,
      day: d.day,
      decision: d.decision as "CONTINUE" | "DQ" | "HIRE" | "DO_NOT_HIRE",
      ratings: d.ratings as Record<string, unknown>,
      autoDqFlags: (d.autoDqFlags as string[]) ?? [],
      notes: d.notes,
      submittedAt: d.submittedAt.toISOString(),
      evaluator: { id: d.evaluator.id, name: d.evaluator.name },
    })),
  };

  return (
    <div className="space-y-6">
      <Link
        href="/trainee/leadership/working-interview"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Working Interviews
      </Link>

      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">{interview.candidateName}</h1>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_TONE_CLASSES[status.tone]}`}
          >
            {status.label}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Started {new Date(interview.startedAt).toLocaleDateString()} by {interview.startedBy.name}
        </p>
      </div>

      <InterviewWorkflowClient interview={serialized} />
    </div>
  );
}
