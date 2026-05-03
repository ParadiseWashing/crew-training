import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { categoryColor, categoryLabel } from "@/lib/utils";
import { CheckCircle2, BookOpen } from "lucide-react";
import { SubjectViewerClient } from "./subject-viewer-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<{ step?: string }>;
}

export default async function SubjectViewerPage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { subjectId } = await params;
  const { step: activeStepId } = await searchParams;

  // Verify this subject is assigned to the user
  const assignment = await prisma.assignment.findFirst({
    where: { userId: session.user.id, subjectId },
  });
  if (!assignment) notFound();

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      topics: {
        include: {
          steps: { orderBy: { orderIndex: "asc" } },
          quiz: {
            include: {
              questions: { orderBy: { orderIndex: "asc" } },
              attempts: {
                where: { userId: session.user.id },
                orderBy: { attemptNum: "desc" },
              },
            },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
      signOffs: { where: { userId: session.user.id } },
    },
  });

  if (!subject) notFound();

  // Fetch all completed step IDs for this user
  const allStepIds = subject.topics.flatMap((t) => t.steps.map((s) => s.id));
  const completedProgress = await prisma.stepProgress.findMany({
    where: { userId: session.user.id, stepId: { in: allStepIds } },
    select: { stepId: true },
  });
  const completedStepIds = new Set(completedProgress.map((p) => p.stepId));

  // Determine the default step if none selected
  const allSteps = subject.topics.flatMap((t) =>
    t.steps.map((s) => ({ ...s, topicId: t.id }))
  );
  const firstIncomplete = allSteps.find((s) => !completedStepIds.has(s.id));
  const resolvedStepId = activeStepId ?? firstIncomplete?.id ?? allSteps[0]?.id ?? null;

  const activeStep = allSteps.find((s) => s.id === resolvedStepId) ?? null;

  // Total step counts
  const totalSteps = allSteps.length;
  const completedCount = allStepIds.filter((id) => completedStepIds.has(id)).length;

  // Sign-off state
  const existingSignOff = subject.signOffs[0] ?? null;
  const allStepsComplete = totalSteps > 0 && completedCount === totalSteps;

  // Find which topic the active step belongs to
  const activeTopic = activeStep
    ? subject.topics.find((t) => t.steps.some((s) => s.id === activeStep.id)) ?? null
    : null;

  // For each topic — check if all steps complete (to show quiz prompt)
  const topicCompletionMap = Object.fromEntries(
    subject.topics.map((t) => [
      t.id,
      t.steps.length > 0 && t.steps.every((s) => completedStepIds.has(s.id)),
    ])
  );

  // Serialize data for client components (JSON-safe)
  const serializedTopics = subject.topics.map((topic) => ({
    id: topic.id,
    title: topic.title,
    description: topic.description,
    orderIndex: topic.orderIndex,
    steps: topic.steps.map((step) => ({
      id: step.id,
      title: step.title,
      orderIndex: step.orderIndex,
      topicId: topic.id,
      completed: completedStepIds.has(step.id),
    })),
    quiz: topic.quiz
      ? {
          id: topic.quiz.id,
          passingScore: topic.quiz.passingScore,
          maxAttempts: topic.quiz.maxAttempts,
          attemptCount: topic.quiz.attempts.length,
          passed: topic.quiz.attempts.some((a) => a.passed),
          lastScore: topic.quiz.attempts[0]?.score ?? null,
        }
      : null,
    allStepsComplete: topicCompletionMap[topic.id],
  }));

  return (
    <div className="-mx-4 sm:-mx-6 -mt-6">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-none flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Breadcrumb
              items={[
                { label: "Training", href: "/trainee/home" },
                { label: subject.title },
              ]}
            />
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <h1 className="text-base font-semibold text-gray-900 truncate">
                {subject.title}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColor(
                  subject.category
                )}`}
              >
                {categoryLabel(subject.category)}
              </span>
            </div>
          </div>

          {/* Progress summary */}
          <div className="flex-shrink-0 flex items-center gap-2 text-sm text-gray-500">
            <BookOpen className="h-4 w-4" />
            <span>
              <span className="font-semibold text-gray-900">{completedCount}</span>
              /{totalSteps} steps
            </span>
            {allStepsComplete && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Done
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main viewer */}
      <SubjectViewerClient
        subjectId={subjectId}
        subjectTitle={subject.title}
        topics={serializedTopics}
        activeStepId={resolvedStepId}
        activeStepContent={
          activeStep ? (activeStep.content as object) : null
        }
        activeStepTitle={activeStep?.title ?? null}
        allStepsComplete={allStepsComplete}
        requiresSignOff={subject.requiresSignOff}
        existingSignOff={
          existingSignOff
            ? { signedName: existingSignOff.signedName, signedAt: existingSignOff.signedAt.toISOString() }
            : null
        }
        userId={session.user.id}
        userName={session.user.name ?? ""}
      />
    </div>
  );
}
