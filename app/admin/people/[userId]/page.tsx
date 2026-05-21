import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader, Breadcrumb } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate, statusLabel } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle,
  BarChart2,
  Award,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { AssignSubjectButton, ResetProgressButton } from "./user-detail-client";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await auth();
  const { userId } = await params;

  const [user, allPublishedSubjects] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        jobRole: true,
        assignments: {
          include: {
            subject: {
              include: {
                topics: {
                  include: {
                    steps: { select: { id: true } },
                    quiz: { select: { id: true, passingScore: true } },
                  },
                  orderBy: { orderIndex: "asc" },
                },
              },
            },
          },
          orderBy: { assignedAt: "desc" },
        },
        quizAttempts: {
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
        },
        signOffs: { include: { subject: { select: { id: true, title: true } } } },
        stepProgress: { select: { stepId: true } },
      },
    }),
    prisma.subject.findMany({
      where: { isPublished: true },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  if (!user) notFound();

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalAssignments = user.assignments.length;
  const completedAssignments = user.assignments.filter(
    (a) => a.status === "COMPLETED"
  ).length;

  const allAttempts = user.quizAttempts;
  const avgScore =
    allAttempts.length > 0
      ? Math.round(
          allAttempts.reduce((s, a) => s + a.score, 0) / allAttempts.length
        )
      : 0;
  const passRate =
    allAttempts.length > 0
      ? Math.round(
          (allAttempts.filter((a) => a.passed).length / allAttempts.length) * 100
        )
      : 0;

  const alreadyAssignedIds = user.assignments.map((a) => a.subjectId);
  const completedStepIds = new Set(user.stepProgress.map((sp) => sp.stepId));
  const signedOffSubjectIds = new Set(user.signOffs.map((s) => s.subjectId));

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Breadcrumb items={[{ label: "People", href: "/admin/people" }, { label: user.name }]} />
        }
        title={user.name}
        actions={
          <AssignSubjectButton
            userId={user.id}
            alreadyAssignedIds={alreadyAssignedIds}
            subjects={allPublishedSubjects}
          />
        }
      />

      {/* User header card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar name={user.name} image={user.image} size="xl" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                {user.systemRole === "ADMIN" && (
                  <Badge variant="warning">Admin</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-2">{user.email}</p>
              <div className="flex flex-wrap items-center gap-2">
                {user.jobRole ? (
                  <Badge
                    variant="info"
                    style={
                      user.jobRole.color
                        ? {
                            backgroundColor: `${user.jobRole.color}20`,
                            color: user.jobRole.color,
                          }
                        : undefined
                    }
                  >
                    {user.jobRole.title}
                  </Badge>
                ) : (
                  <Badge variant="outline">No role assigned</Badge>
                )}
                <span className="text-xs text-gray-400">
                  Member since {formatDate(user.createdAt)}
                </span>
              </div>
            </div>
            <Link
              href="/admin/people"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors sm:self-start"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Assignments"
          value={totalAssignments}
          icon={<BookOpen className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label="Completed"
          value={completedAssignments}
          icon={<CheckCircle className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label="Avg Quiz Score"
          value={allAttempts.length > 0 ? `${avgScore}%` : "—"}
          icon={<BarChart2 className="h-5 w-5" />}
          color="purple"
        />
        <StatCard
          label="Quiz Pass Rate"
          value={allAttempts.length > 0 ? `${passRate}%` : "—"}
          icon={<Award className="h-5 w-5" />}
          color="amber"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="progress">
        <TabsList>
          <TabsTrigger value="progress">Training Progress</TabsTrigger>
          <TabsTrigger value="quiz-history">Quiz History ({allAttempts.length})</TabsTrigger>
        </TabsList>

        {/* ── Training Progress Tab ── */}
        <TabsContent value="progress">
          {user.assignments.length === 0 ? (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <BookOpen className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">No subjects assigned</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Assign subjects to start tracking this employee's training progress.
                  </p>
                  <AssignSubjectButton
                    userId={user.id}
                    alreadyAssignedIds={alreadyAssignedIds}
                    subjects={allPublishedSubjects}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {user.assignments.map((assignment) => {
                const subject = assignment.subject;
                const totalSteps = subject.topics.reduce(
                  (s, t) => s + t.steps.length,
                  0
                );
                const completedSteps = subject.topics.reduce(
                  (s, t) =>
                    s + t.steps.filter((step) => completedStepIds.has(step.id)).length,
                  0
                );
                const hasSignOff = subject.requiresSignOff;
                const isSigned = signedOffSubjectIds.has(subject.id);

                const statusVariantMap: Record<
                  string,
                  "default" | "success" | "warning" | "info"
                > = {
                  NOT_STARTED: "default",
                  IN_PROGRESS: "info",
                  COMPLETED: "success",
                };

                return (
                  <Card key={assignment.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <CardTitle className="text-base">{subject.title}</CardTitle>
                            <Badge
                              variant={
                                statusVariantMap[assignment.status] ?? "default"
                              }
                            >
                              {statusLabel(assignment.status)}
                            </Badge>
                            {hasSignOff && (
                              <div
                                className={`flex items-center gap-1 text-xs font-medium ${
                                  isSigned
                                    ? "text-green-600"
                                    : "text-amber-600"
                                }`}
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {isSigned ? "Signed off" : "Sign-off required"}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            Assigned {formatDate(assignment.assignedAt)}
                            {assignment.completedAt &&
                              ` · Completed ${formatDate(assignment.completedAt)}`}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                          <div>
                            <p className="text-2xl font-bold text-gray-900">
                              {Math.round(assignment.progressPercentage)}%
                            </p>
                            <p className="text-xs text-gray-400">
                              {completedSteps}/{totalSteps} steps
                            </p>
                          </div>
                          <ResetProgressButton
                            userId={user.id}
                            userName={user.name}
                            subjectId={subject.id}
                            subjectTitle={subject.title}
                          />
                        </div>
                      </div>
                      <Progress
                        value={assignment.progressPercentage}
                        size="md"
                        className="mt-2"
                      />
                    </CardHeader>

                    {subject.topics.length > 0 && (
                      <CardContent className="pt-0">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                          Topics
                        </p>
                        <div className="space-y-2">
                          {subject.topics.map((topic) => {
                            const topicSteps = topic.steps.length;
                            const topicDone = topic.steps.filter((s) =>
                              completedStepIds.has(s.id)
                            ).length;
                            const pct =
                              topicSteps > 0
                                ? Math.round((topicDone / topicSteps) * 100)
                                : 0;

                            return (
                              <div key={topic.id} className="flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-700 truncate">
                                      {topic.title}
                                    </span>
                                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                      {topicDone}/{topicSteps}
                                    </span>
                                  </div>
                                  <Progress value={pct} size="sm" />
                                </div>
                                {topic.quiz && (
                                  <div className="flex-shrink-0">
                                    {allAttempts.some(
                                      (a) => a.quiz.topic.title === topic.title && a.passed
                                    ) ? (
                                      <span className="text-xs text-green-600 font-medium">
                                        Quiz passed
                                      </span>
                                    ) : allAttempts.some(
                                        (a) => a.quiz.topic.title === topic.title
                                      ) ? (
                                      <span className="text-xs text-red-500 font-medium">
                                        Quiz failed
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-400">
                                        Quiz pending
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Quiz History Tab ── */}
        <TabsContent value="quiz-history">
          <Card>
            <CardContent className="p-0">
              {allAttempts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <BarChart2 className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">No quiz attempts yet</p>
                  <p className="text-sm text-gray-500">
                    Quiz attempts will appear here as the trainee completes quizzes.
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span>Quiz</span>
                    <span>Subject</span>
                    <span>Score</span>
                    <span>Attempt #</span>
                    <span>Date</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {allAttempts.map((attempt) => (
                      <div
                        key={attempt.id}
                        className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-1 md:gap-4 items-center px-6 py-4"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {attempt.quiz.topic.title}
                          </p>
                          <p className="text-xs text-gray-400 md:hidden">
                            {attempt.quiz.topic.subject.title}
                          </p>
                        </div>
                        <span className="text-sm text-gray-600 hidden md:block truncate">
                          {attempt.quiz.topic.subject.title}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-sm font-bold ${
                              attempt.passed ? "text-green-600" : "text-red-500"
                            }`}
                          >
                            {Math.round(attempt.score)}%
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              attempt.passed
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {attempt.passed ? "Pass" : "Fail"}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">#{attempt.attemptNum}</span>
                        <span className="text-sm text-gray-400">
                          {formatDate(attempt.takenAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
