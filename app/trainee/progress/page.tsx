import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  categoryColor,
  categoryLabel,
  formatDate,
  formatRelativeTime,
  cn,
} from "@/lib/utils";
import {
  CheckCircle2,
  BookOpen,
  TrendingUp,
  ClipboardList,
  Clock,
  Award,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Fetch assignments with full subject/topic/step tree
  const assignments = await prisma.assignment.findMany({
    where: { userId },
    include: {
      subject: {
        include: {
          topics: {
            orderBy: { orderIndex: "asc" },
            include: {
              steps: {
                orderBy: { orderIndex: "asc" },
                select: { id: true, title: true },
              },
              quiz: {
                select: {
                  id: true,
                  passingScore: true,
                  maxAttempts: true,
                  topic: { select: { title: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  // Fetch user's step progress
  const stepProgressRecords = await prisma.stepProgress.findMany({
    where: { userId },
    include: {
      step: {
        select: {
          id: true,
          title: true,
          topic: {
            select: {
              title: true,
              subject: { select: { id: true, title: true } },
            },
          },
        },
      },
    },
    orderBy: { completedAt: "desc" },
  });

  // Fetch quiz attempts with topic/subject context
  const quizAttempts = await prisma.quizAttempt.findMany({
    where: { userId },
    include: {
      quiz: {
        include: {
          topic: {
            select: {
              title: true,
              subject: { select: { id: true, title: true } },
            },
          },
        },
      },
    },
    orderBy: { takenAt: "desc" },
  });

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalAssigned = assignments.length;
  const completedCount = assignments.filter((a) => a.status === "COMPLETED").length;
  const inProgressCount = assignments.filter((a) => a.status === "IN_PROGRESS").length;
  const avgCompletion =
    totalAssigned > 0
      ? Math.round(
          assignments.reduce((sum, a) => sum + a.progressPercentage, 0) / totalAssigned
        )
      : 0;

  const completedStepIds = new Set(stepProgressRecords.map((sp) => sp.stepId));

  // ── Recent step completions (last 10) ─────────────────────────────────────
  const recentCompletions = stepProgressRecords.slice(0, 10);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="My Progress"
        description="Track your training completion and quiz results."
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalAssigned}</p>
                <p className="text-xs text-gray-500">Assigned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{inProgressCount}</p>
                <p className="text-xs text-gray-500">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{avgCompletion}%</p>
                <p className="text-xs text-gray-500">Avg. Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject progress list */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-gray-400" />
          Subject Progress
        </h2>

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-10 w-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-500">No assignments yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const allSubjectSteps = assignment.subject.topics.flatMap((t) => t.steps);
              const completedSubjectSteps = allSubjectSteps.filter((s) =>
                completedStepIds.has(s.id)
              ).length;
              const totalSubjectSteps = allSubjectSteps.length;
              const progress = Math.round(assignment.progressPercentage);

              return (
                <Card key={assignment.id}>
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                              categoryColor(assignment.subject.category)
                            )}
                          >
                            {categoryLabel(assignment.subject.category)}
                          </span>
                          {assignment.status === "COMPLETED" && (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Complete
                            </Badge>
                          )}
                          {assignment.status === "IN_PROGRESS" && (
                            <Badge variant="info">In Progress</Badge>
                          )}
                          {assignment.status === "NOT_STARTED" && (
                            <Badge variant="default">Not Started</Badge>
                          )}
                        </div>
                        <Link
                          href={`/trainee/subjects/${assignment.subjectId}`}
                          className="font-semibold text-gray-900 hover:text-accent transition-colors text-sm"
                        >
                          {assignment.subject.title}
                        </Link>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-lg font-bold text-gray-900">{progress}%</span>
                        <p className="text-xs text-gray-500">
                          {completedSubjectSteps}/{totalSubjectSteps} steps
                        </p>
                      </div>
                    </div>

                    <Progress value={progress} size="md" />

                    {/* Topic breakdown */}
                    {assignment.subject.topics.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {assignment.subject.topics.map((topic) => {
                          const topicCompleted = topic.steps.filter((s) =>
                            completedStepIds.has(s.id)
                          ).length;
                          const topicTotal = topic.steps.length;
                          const topicDone = topicTotal > 0 && topicCompleted === topicTotal;

                          return (
                            <div
                              key={topic.id}
                              className="flex items-center gap-2 text-xs text-gray-500"
                            >
                              {topicDone ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                              ) : (
                                <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                              )}
                              <span className="truncate">{topic.title}</span>
                              <span className="ml-auto flex-shrink-0 text-gray-400">
                                {topicCompleted}/{topicTotal}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Quiz attempts history */}
      {quizAttempts.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-gray-400" />
            Quiz History
          </h2>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Topic
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                      Subject
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Score
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Result
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                      Attempt
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {quizAttempts.map((attempt) => (
                    <tr key={attempt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {attempt.quiz.topic.title}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                        <Link
                          href={`/trainee/subjects/${attempt.quiz.topic.subject.id}`}
                          className="hover:text-accent transition-colors truncate max-w-[160px] block"
                        >
                          {attempt.quiz.topic.subject.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "font-bold",
                            attempt.score >= 90
                              ? "text-emerald-600"
                              : attempt.score >= 70
                              ? "text-amber-600"
                              : "text-red-600"
                          )}
                        >
                          {Math.round(attempt.score)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {attempt.passed ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Passed
                          </Badge>
                        ) : (
                          <Badge variant="danger">Failed</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 hidden md:table-cell">
                        #{attempt.attemptNum}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 text-xs hidden lg:table-cell">
                        {formatDate(attempt.takenAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      {/* Recent step completions */}
      {recentCompletions.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" />
            Recent Activity
          </h2>

          <Card>
            <CardContent className="pt-4 pb-2">
              <ul className="divide-y divide-gray-50">
                {recentCompletions.map((sp) => (
                  <li
                    key={sp.id}
                    className="flex items-center gap-3 py-3"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {sp.step.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {sp.step.topic.subject.title} &middot; {sp.step.topic.title}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatRelativeTime(sp.completedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Empty state: no activity at all */}
      {assignments.length === 0 && quizAttempts.length === 0 && recentCompletions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <TrendingUp className="h-12 w-12 text-gray-200 mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">No activity yet</h3>
            <p className="text-sm text-gray-400 max-w-xs">
              Your training progress will appear here as you complete steps and quizzes.
            </p>
            <Link href="/trainee/home" className="mt-4">
              <span className="text-sm text-accent hover:text-accent font-medium">
                Go to Training →
              </span>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
