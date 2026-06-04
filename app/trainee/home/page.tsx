import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { categoryColor, categoryLabel, formatDate } from "@/lib/utils";
import { CheckCircle2, BookOpen, ArrowRight, ClipboardList, Layers } from "lucide-react";

export const dynamic = "force-dynamic";

const categoryGradients: Record<string, string> = {
  COMPANY: "from-purple-500 to-indigo-600",
  POLICIES: "from-amber-400 to-orange-500",
  PROCESSES: "from-accent to-accent-hover",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function TraineeHomePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const assignments = await prisma.assignment.findMany({
    where: { userId: session.user.id },
    include: {
      subject: {
        include: {
          topics: {
            include: {
              steps: { select: { id: true } },
            },
            orderBy: { orderIndex: "asc" },
          },
        },
      },
    },
    orderBy: [{ status: "asc" }, { assignedAt: "desc" }],
  });

  // Find the most recently active assignment (in-progress first, else first not started)
  const continueAssignment =
    assignments.find((a) => a.status === "IN_PROGRESS") ??
    assignments.find((a) => a.status === "NOT_STARTED");

  const firstName = session.user.name?.split(" ")[0] ?? "there";
  const todayLabel = formatDate(new Date());

  return (
    <div className="space-y-8">
      {/* Header greeting */}
      <div>
        <p className="text-sm text-gray-500">{todayLabel}</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
          {getGreeting()}, {firstName}!
        </h1>
      </div>

      {/* Continue Training hero */}
      {continueAssignment && continueAssignment.status !== "COMPLETED" && (
        <div className="rounded-2xl bg-pw-black text-white p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">
            Continue Training
          </p>
          <h2 className="text-xl font-bold leading-snug mb-1">
            {continueAssignment.subject.title}
          </h2>
          {continueAssignment.subject.description && (
            <p className="text-sm text-gray-300 mb-4 line-clamp-2">
              {continueAssignment.subject.description}
            </p>
          )}

          <div className="mb-5">
            <div className="flex items-center justify-between text-xs text-gray-300 mb-1.5">
              <span>Progress</span>
              <span>{Math.round(continueAssignment.progressPercentage)}%</span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${continueAssignment.progressPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {continueAssignment.subject.topics.length}{" "}
              {continueAssignment.subject.topics.length === 1 ? "topic" : "topics"}
            </span>
            <Link href={`/trainee/subjects/${continueAssignment.subjectId}`}>
              <Button
                variant="default"
                size="md"
                className="bg-accent hover:bg-accent text-white gap-1.5"
              >
                {continueAssignment.status === "NOT_STARTED" ? "Start" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* All done state */}
      {assignments.length > 0 &&
        assignments.every((a) => a.status === "COMPLETED") && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 sm:p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-emerald-900 mb-1">
              All caught up!
            </h2>
            <p className="text-sm text-emerald-700">
              You&apos;ve completed all your assigned training subjects.
            </p>
          </div>
        )}

      {/* My Assignments grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">
              My Assignments
              {assignments.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({assignments.length})
                </span>
              )}
            </h2>
          </div>
          {assignments.length > 0 && (
            <Link
              href="/trainee/progress"
              className="text-xs text-accent hover:text-accent font-medium"
            >
              View progress →
            </Link>
          )}
        </div>

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4">📚</div>
              <p className="text-base font-semibold text-gray-700 mb-1">
                No assignments yet
              </p>
              <p className="text-sm text-gray-400 max-w-xs">
                Your manager will assign training subjects to you. Check back
                soon!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {assignments.map((assignment) => {
              const isCompleted = assignment.status === "COMPLETED";
              const isStarted = assignment.status === "IN_PROGRESS";
              const topicCount = assignment.subject.topics.length;
              const progress = Math.round(assignment.progressPercentage);

              return (
                <Card
                  key={assignment.id}
                  className="flex flex-col overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Cover image / gradient placeholder */}
                  <div
                    className={`relative aspect-[3/1] bg-gradient-to-br ${
                      categoryGradients[assignment.subject.category] ??
                      "from-gray-400 to-gray-600"
                    }`}
                  >
                    <div className="absolute inset-0 bg-black/10" />
                    {assignment.subject.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={assignment.subject.coverImage}
                        alt={assignment.subject.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <Layers className="absolute top-4 right-4 h-8 w-8 text-white/40" />
                    )}
                  </div>

                  <CardContent className="flex flex-col flex-1 pt-5 pb-5">
                    {/* Category + status row */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColor(
                          assignment.subject.category
                        )}`}
                      >
                        {categoryLabel(assignment.subject.category)}
                      </span>

                      {isCompleted ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed
                        </Badge>
                      ) : isStarted ? (
                        <Badge variant="info">In Progress</Badge>
                      ) : (
                        <Badge variant="default">Not Started</Badge>
                      )}
                    </div>

                    {/* Title & description */}
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1">
                      {assignment.subject.title}
                    </h3>
                    {assignment.subject.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                        {assignment.subject.description}
                      </p>
                    )}

                    {/* Topic count */}
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                      <BookOpen className="h-3.5 w-3.5" />
                      {topicCount} {topicCount === 1 ? "topic" : "topics"}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-auto">
                      <Progress
                        value={progress}
                        showLabel
                        size="sm"
                        className="mb-3"
                      />

                      <Link
                        href={`/trainee/subjects/${assignment.subjectId}`}
                        className="block"
                      >
                        <Button
                          variant={isCompleted ? "outline" : "default"}
                          size="sm"
                          className="w-full"
                        >
                          {isCompleted
                            ? "Review"
                            : isStarted
                            ? "Continue →"
                            : "Start →"}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
