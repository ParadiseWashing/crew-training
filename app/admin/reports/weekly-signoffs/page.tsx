import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import {
  WeeklySignOffsClient,
  type SignOffRow,
  type SubjectCoverage,
} from "./weekly-signoffs-client";

export const dynamic = "force-dynamic";

export default async function WeeklySignOffsPage() {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") redirect("/login");

  const [signOffs, subjects] = await Promise.all([
    prisma.weeklySignOff.findMany({
      include: {
        trainee: { select: { id: true, name: true, email: true } },
        trainer: { select: { id: true, name: true } },
        subject: { select: { id: true, title: true } },
      },
      orderBy: { signedAt: "desc" },
    }),
    // Only multi-week curricula have weekly sign-offs.
    prisma.subject.findMany({
      where: { topics: { some: { weekNumber: { not: null } } } },
      select: {
        id: true,
        title: true,
        topics: {
          where: { weekNumber: { not: null } },
          select: { id: true, title: true, weekNumber: true },
          orderBy: [{ weekNumber: "asc" }, { orderIndex: "asc" }],
        },
        assignments: {
          select: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { orderIndex: "asc" },
    }),
  ]);

  const topicTitle = new Map<string, string>();
  for (const s of subjects) for (const t of s.topics) topicTitle.set(t.id, t.title);

  const rows: SignOffRow[] = signOffs.map((s) => {
    const ratings = (s.topicRatings as Record<string, "PASS" | "NEEDS_WORK">) ?? {};
    return {
      id: s.id,
      weekNumber: s.weekNumber,
      decision: s.decision,
      notes: s.notes,
      trainerSignedName: s.trainerSignedName,
      signedAt: s.signedAt.toISOString(),
      trainee: s.trainee,
      trainerName: s.trainer.name,
      subject: s.subject,
      ratings: Object.entries(ratings).map(([topicId, rating]) => ({
        topicId,
        topicTitle: topicTitle.get(topicId) ?? "Topic",
        rating,
      })),
    };
  });

  const coverage: SubjectCoverage[] = subjects.map((s) => {
    const weeks = [...new Set(s.topics.map((t) => t.weekNumber!))].sort((a, b) => a - b);
    const trainees = [...new Map(s.assignments.map((a) => [a.user.id, a.user])).values()].sort(
      (a, b) => a.name.localeCompare(b.name)
    );
    return {
      subjectId: s.id,
      subjectTitle: s.title,
      weeks,
      trainees: trainees.map((t) => ({
        id: t.id,
        name: t.name,
        cells: weeks.map((w) => {
          const match = signOffs.find(
            (so) => so.subjectId === s.id && so.weekNumber === w && so.traineeUserId === t.id
          );
          return { week: w, decision: match ? match.decision : null };
        }),
      })),
    };
  });

  const pendingWeeks = coverage.reduce(
    (sum, c) => sum + c.trainees.reduce((n, t) => n + t.cells.filter((c2) => !c2.decision).length, 0),
    0
  );
  // No assignments at all means there is nothing to sign yet — don't claim
  // everything is signed off, which reads as false reassurance.
  const anyTrainees = coverage.some((c) => c.trainees.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly Sign-Offs"
        description={
          !anyTrainees
            ? "Weekly sign-offs appear here once trainees are assigned to a multi-week module."
            : pendingWeeks > 0
              ? `${pendingWeeks} trainee-week${pendingWeeks !== 1 ? "s" : ""} still unsigned across the multi-week curricula.`
              : "Every assigned trainee-week has been signed off."
        }
      />
      <WeeklySignOffsClient rows={rows} coverage={coverage} />
    </div>
  );
}
