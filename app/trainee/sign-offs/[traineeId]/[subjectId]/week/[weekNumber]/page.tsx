import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Breadcrumb } from "@/components/shared/page-header";
import { SignOffForm } from "./signoff-form-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ traineeId: string; subjectId: string; weekNumber: string }>;
}

export default async function WeeklySignOffPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { traineeId, subjectId, weekNumber: weekStr } = await params;
  const weekNumber = parseInt(weekStr, 10);
  if (!Number.isFinite(weekNumber)) notFound();

  const { getUserPermissions } = await import("@/lib/permissions");
  const perms = await getUserPermissions(session.user.id);
  if (!perms.canSignOffTraining) redirect("/trainee/home");

  // Load trainee, subject, topics for this week, and any existing sign-off
  const [trainee, subject, topics, existing] = await Promise.all([
    prisma.user.findUnique({
      where: { id: traineeId },
      select: { id: true, name: true, email: true },
    }),
    prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, title: true },
    }),
    prisma.topic.findMany({
      where: { subjectId, weekNumber },
      orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }],
      select: { id: true, title: true, dayNumber: true },
    }),
    prisma.weeklySignOff.findUnique({
      where: {
        subjectId_weekNumber_traineeUserId: {
          subjectId,
          weekNumber,
          traineeUserId: traineeId,
        },
      },
    }),
  ]);

  if (!trainee || !subject) notFound();
  if (topics.length === 0) {
    return (
      <div>
        <PageHeader
          title={`Week ${weekNumber} Sign-Off`}
          description={`${trainee.name} — ${subject.title}`}
          breadcrumb={
            <Breadcrumb
              items={[
                { label: "Sign-Offs", href: "/trainee/sign-offs" },
                { label: `Week ${weekNumber}` },
              ]}
            />
          }
        />
        <p className="text-sm text-gray-500">
          No topics found for Week {weekNumber} in this subject.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Week ${weekNumber} Sign-Off`}
        description={`${trainee.name} — ${subject.title}`}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: "Sign-Offs", href: "/trainee/sign-offs" },
              { label: `${trainee.name} · Week ${weekNumber}` },
            ]}
          />
        }
      />
      <SignOffForm
        subjectId={subjectId}
        weekNumber={weekNumber}
        traineeId={traineeId}
        traineeName={trainee.name}
        topics={topics.map((t) => ({
          id: t.id,
          title: t.title,
          dayNumber: t.dayNumber,
        }))}
        existing={
          existing
            ? {
                decision: existing.decision as "PASSED" | "FAILED",
                topicRatings: existing.topicRatings as Record<string, "PASS" | "NEEDS_WORK">,
                notes: existing.notes ?? "",
                trainerSignedName: existing.trainerSignedName,
                signedAt: existing.signedAt.toISOString(),
              }
            : null
        }
        defaultTrainerName={session.user.name ?? ""}
      />
    </div>
  );
}
