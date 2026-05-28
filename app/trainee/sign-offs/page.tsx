import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, CheckCircle2, XCircle, ArrowRight, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SignOffsListPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { getUserPermissions } = await import("@/lib/permissions");
  const perms = await getUserPermissions(session.user.id);
  if (!perms.canSignOffTraining) redirect("/trainee/home");

  // Find all subjects that have at least one topic with a weekNumber
  // (i.e. subjects that use the weekly curriculum structure).
  const subjects = await prisma.subject.findMany({
    where: {
      topics: { some: { weekNumber: { not: null } } },
    },
    include: {
      topics: {
        where: { weekNumber: { not: null } },
        select: { id: true, weekNumber: true },
      },
    },
    orderBy: { title: "asc" },
  });

  // All trainees (non-admin, accepted invite, not the current user)
  const trainees = await prisma.user.findMany({
    where: {
      systemRole: "TRAINEE",
      inviteStatus: "ACCEPTED",
      id: { not: session.user.id },
    },
    select: { id: true, name: true, email: true, jobRole: { select: { title: true, color: true } } },
    orderBy: { name: "asc" },
  });

  // Existing sign-offs (so we can show pass/fail status per trainee/week)
  const existingSignOffs = await prisma.weeklySignOff.findMany({
    where: { subjectId: { in: subjects.map((s) => s.id) } },
    select: {
      id: true,
      subjectId: true,
      weekNumber: true,
      traineeUserId: true,
      decision: true,
      signedAt: true,
      trainer: { select: { name: true } },
    },
  });

  // Index for quick lookup: `${subjectId}:${weekNumber}:${traineeId}` -> signoff
  const signOffByKey = new Map(
    existingSignOffs.map((s) => [
      `${s.subjectId}:${s.weekNumber}:${s.traineeUserId}`,
      s,
    ])
  );

  // Compute distinct week numbers per subject (sorted)
  const subjectWeeks = subjects.map((s) => ({
    id: s.id,
    title: s.title,
    weeks: [...new Set(s.topics.map((t) => t.weekNumber!).filter(Boolean))].sort(
      (a, b) => a - b
    ),
  }));

  return (
    <div>
      <PageHeader
        title="Training Sign-Offs"
        description="Certify trainees at the end of each onboarding week."
      />

      {subjectWeeks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500 text-sm">
            No multi-week curricula configured yet.
          </CardContent>
        </Card>
      ) : trainees.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No trainees to sign off on yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {subjectWeeks.map((subj) => (
            <Card key={subj.id}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardCheck className="h-4 w-4 text-accent" />
                  <h2 className="text-base font-semibold text-gray-900">{subj.title}</h2>
                </div>

                <div className="space-y-3">
                  {trainees.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-lg border border-gray-200 p-3"
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{t.name}</p>
                          <p className="text-xs text-gray-500 truncate">{t.email}</p>
                        </div>
                        {t.jobRole && (
                          <Badge
                            style={{
                              backgroundColor: `${t.jobRole.color ?? "#F08A3E"}20`,
                              color: t.jobRole.color ?? "#F08A3E",
                            }}
                            className="border-0 flex-shrink-0"
                          >
                            {t.jobRole.title}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {subj.weeks.map((week) => {
                          const signoff = signOffByKey.get(`${subj.id}:${week}:${t.id}`);
                          const href = `/trainee/sign-offs/${t.id}/${subj.id}/week/${week}`;

                          let statusEl;
                          if (signoff?.decision === "PASSED") {
                            statusEl = (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Passed
                              </span>
                            );
                          } else if (signoff?.decision === "FAILED") {
                            statusEl = (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                                <XCircle className="h-3.5 w-3.5" /> Failed
                              </span>
                            );
                          } else {
                            statusEl = (
                              <span className="text-xs text-gray-400">Not signed</span>
                            );
                          }

                          return (
                            <Link
                              key={week}
                              href={href}
                              className="group flex flex-col gap-1 rounded-md border border-gray-200 hover:border-accent-soft hover:bg-accent-tint/30 transition-colors p-2.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-700">
                                  Week {week}
                                </span>
                                <ArrowRight className="h-3 w-3 text-gray-300 group-hover:text-accent transition-colors" />
                              </div>
                              {statusEl}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
