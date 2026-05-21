import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Users, BookOpen, TrendingUp, ClipboardList, Award, ClipboardCheck, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function ReportsPage() {
  await auth();

  const [
    users,
    subjects,
    assignments,
    quizAttempts,
    workingInterviewCounts,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { systemRole: "TRAINEE" },
      include: {
        jobRole: { select: { title: true } },
        assignments: true,
        stepProgress: { orderBy: { completedAt: "desc" }, take: 1 },
      },
      orderBy: { name: "asc" },
    }),
    prisma.subject.findMany({
      include: {
        assignments: true,
        topics: {
          include: {
            quiz: {
              include: { attempts: true },
            },
          },
        },
      },
      orderBy: { title: "asc" },
    }),
    prisma.assignment.findMany({
      include: { user: true, subject: true },
    }),
    prisma.quizAttempt.findMany({
      include: {
        quiz: {
          include: {
            topic: {
              select: {
                id: true,
                title: true,
                subject: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
      orderBy: { takenAt: "desc" },
    }),
    prisma.workingInterview.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const wiCounts = {
    inProgress: workingInterviewCounts.find((c) => c.status === "IN_PROGRESS")?._count._all ?? 0,
    passed: workingInterviewCounts.find((c) => c.status === "PASSED")?._count._all ?? 0,
    disqualified: workingInterviewCounts.find((c) => c.status === "DISQUALIFIED")?._count._all ?? 0,
  };
  const wiTotal = wiCounts.inProgress + wiCounts.passed + wiCounts.disqualified;

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalTrainees = users.length;
  const publishedSubjects = subjects.filter((s) => s.isPublished).length;
  const totalAttempts = quizAttempts.length;
  const passedAttempts = quizAttempts.filter((a) => a.passed).length;
  const overallPassRate =
    totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;

  const overallCompletion =
    assignments.length > 0
      ? Math.round(
          assignments.reduce((s, a) => s + a.progressPercentage, 0) / assignments.length
        )
      : 0;

  // ── Per-subject rows ───────────────────────────────────────────────────────
  const subjectRows = subjects.map((subject) => {
    const assigned = subject.assignments.length;
    const completed = subject.assignments.filter((a) => a.status === "COMPLETED").length;
    const avgCompletion =
      assigned > 0
        ? Math.round(
            subject.assignments.reduce((s, a) => s + a.progressPercentage, 0) / assigned
          )
        : 0;

    const subjectAttempts = subject.topics.flatMap(
      (t) => t.quiz?.attempts ?? []
    );
    const avgScore =
      subjectAttempts.length > 0
        ? Math.round(
            subjectAttempts.reduce((s, a) => s + a.score, 0) / subjectAttempts.length
          )
        : null;

    return { subject, assigned, completed, avgCompletion, avgScore };
  });

  // ── Per-user rows ──────────────────────────────────────────────────────────
  const userRows = users.map((user) => {
    const userAssignments = assignments.filter((a) => a.userId === user.id);
    const assignedCount = userAssignments.length;
    const completedCount = userAssignments.filter(
      (a) => a.status === "COMPLETED"
    ).length;
    const overallPct =
      assignedCount > 0
        ? Math.round(
            userAssignments.reduce((s, a) => s + a.progressPercentage, 0) / assignedCount
          )
        : 0;
    const lastActive = user.stepProgress[0]?.completedAt ?? user.updatedAt;

    return {
      user,
      assignedCount,
      completedCount,
      overallPct,
      lastActive,
    };
  });

  // ── Per-quiz rows ──────────────────────────────────────────────────────────
  // Group by quizId
  const quizMap = new Map<
    string,
    {
      quizId: string;
      topicTitle: string;
      subjectTitle: string;
      attempts: typeof quizAttempts;
    }
  >();

  for (const attempt of quizAttempts) {
    const existing = quizMap.get(attempt.quizId);
    if (existing) {
      existing.attempts.push(attempt);
    } else {
      quizMap.set(attempt.quizId, {
        quizId: attempt.quizId,
        topicTitle: attempt.quiz.topic.title,
        subjectTitle: attempt.quiz.topic.subject.title,
        attempts: [attempt],
      });
    }
  }

  const quizRows = Array.from(quizMap.values()).map((q) => {
    const total = q.attempts.length;
    const passed = q.attempts.filter((a) => a.passed).length;
    const passRatePct = total > 0 ? Math.round((passed / total) * 100) : 0;
    const avgScore =
      total > 0
        ? Math.round(q.attempts.reduce((s, a) => s + a.score, 0) / total)
        : 0;
    return { ...q, total, passed, passRatePct, avgScore };
  });

  quizRows.sort((a, b) => b.total - a.total);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Overview of team training progress, quiz performance, and completion rates."
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Total Trainees"
          value={totalTrainees}
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label="Overall Completion"
          value={`${overallCompletion}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label="Published Subjects"
          value={publishedSubjects}
          icon={<BookOpen className="h-5 w-5" />}
          color="purple"
        />
        <StatCard
          label="Total Quiz Attempts"
          value={totalAttempts}
          icon={<ClipboardList className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          label="Quiz Pass Rate"
          value={totalAttempts > 0 ? `${overallPassRate}%` : "—"}
          icon={<Award className="h-5 w-5" />}
          color="green"
        />
      </div>

      {/* Working Interviews link card */}
      <Link href="/admin/reports/working-interviews" className="block group mb-8">
        <Card className="hover:border-accent-soft hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-accent-tint flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="h-6 w-6 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-gray-900 group-hover:text-accent transition-colors">
                Working Interviews
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                {wiTotal === 0
                  ? "No working interviews yet."
                  : `${wiTotal} total — ${wiCounts.inProgress} in progress, ${wiCounts.passed} passed, ${wiCounts.disqualified} DQ`}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-accent transition-colors flex-shrink-0" />
          </CardContent>
        </Card>
      </Link>

      <div className="space-y-8">
        {/* ── Per-Subject Completion Table ── */}
        <Card>
          <CardHeader>
            <CardTitle>Subject Completion</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Completion and quiz performance broken down by subject.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {subjectRows.length === 0 ? (
              <div className="px-6 pb-6 text-center text-sm text-gray-400 py-8">
                No subjects found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide">
                        Subject
                      </th>
                      <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide text-center">
                        Assigned
                      </th>
                      <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide text-center">
                        Completed
                      </th>
                      <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide min-w-[180px]">
                        Avg Completion
                      </th>
                      <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide text-center">
                        Avg Quiz Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {subjectRows.map(({ subject, assigned, completed, avgCompletion, avgScore }) => (
                      <tr key={subject.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{subject.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {subject.isPublished ? "Published" : "Draft"}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-700">{assigned}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-medium text-gray-900">{completed}</span>
                          {assigned > 0 && (
                            <span className="text-gray-400 ml-1 text-xs">
                              ({Math.round((completed / assigned) * 100)}%)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Progress value={avgCompletion} showLabel size="sm" />
                        </td>
                        <td className="px-6 py-4 text-center">
                          {avgScore !== null ? (
                            <span
                              className={`font-semibold ${
                                avgScore >= 80
                                  ? "text-green-600"
                                  : avgScore >= 60
                                  ? "text-amber-600"
                                  : "text-red-500"
                              }`}
                            >
                              {avgScore}%
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Per-User Completion Table ── */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Progress</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Individual trainee completion across all assigned subjects.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {userRows.length === 0 ? (
              <div className="px-6 pb-6 text-center text-sm text-gray-400 py-8">
                No trainees found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide">
                        Employee
                      </th>
                      <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                        Job Role
                      </th>
                      <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide text-center">
                        Assigned
                      </th>
                      <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide text-center">
                        Completed
                      </th>
                      <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide min-w-[160px]">
                        Overall %
                      </th>
                      <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide hidden md:table-cell">
                        Last Active
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {userRows.map(({ user, assignedCount, completedCount, overallPct, lastActive }) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          {user.jobRole ? (
                            <Badge variant="info">{user.jobRole.title}</Badge>
                          ) : (
                            <span className="text-xs text-gray-400">No role</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-700">
                          {assignedCount}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-700">
                          {completedCount}
                        </td>
                        <td className="px-6 py-4">
                          <Progress value={overallPct} showLabel size="sm" />
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400 hidden md:table-cell">
                          {formatDate(lastActive)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Quiz Performance Table ── */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz Performance</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Aggregated quiz stats by topic, sorted by number of attempts.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {quizRows.length === 0 ? (
              <div className="px-6 pb-6 text-center text-sm text-gray-400 py-8">
                No quiz attempts recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide">
                        Topic
                      </th>
                      <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                        Subject
                      </th>
                      <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide text-center">
                        Attempts
                      </th>
                      <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide text-center">
                        Passed
                      </th>
                      <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide text-center">
                        Pass Rate
                      </th>
                      <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide text-center">
                        Avg Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {quizRows.map((row) => (
                      <tr key={row.quizId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {row.topicTitle}
                        </td>
                        <td className="px-6 py-4 text-gray-600 hidden sm:table-cell">
                          {row.subjectTitle}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-700">{row.total}</td>
                        <td className="px-6 py-4 text-center text-gray-700">{row.passed}</td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`font-semibold ${
                              row.passRatePct >= 80
                                ? "text-green-600"
                                : row.passRatePct >= 50
                                ? "text-amber-600"
                                : "text-red-500"
                            }`}
                          >
                            {row.passRatePct}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`font-semibold ${
                              row.avgScore >= 80
                                ? "text-green-600"
                                : row.avgScore >= 60
                                ? "text-amber-600"
                                : "text-red-500"
                            }`}
                          >
                            {row.avgScore}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
