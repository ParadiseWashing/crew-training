import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    weekNumber: topic.weekNumber,
    dayNumber: topic.dayNumber,
    steps: topic.steps.map((step) => ({
      id: step.id,
      title: step.title,
      stepType: step.stepType as "CONTENT" | "PDF" | "SIGNATURE",
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

  // If the active step is a SIGNATURE step, pre-resolve its data
  let signatureStepData: {
    agreementText: string;
    alreadySigned: boolean;
    signedAt: string | null;
    signedPdfDownloadUrl: string | null;
  } | null = null;

  if (activeStep && activeStep.stepType === "SIGNATURE") {
    const content = (activeStep.content ?? {}) as {
      agreementText?: string;
    };
    const existingSig = await prisma.handbookSignature.findFirst({
      where: { userId: session.user.id, stepId: activeStep.id },
      orderBy: { signedAt: "desc" },
      select: { id: true, signedAt: true },
    });
    signatureStepData = {
      agreementText:
        content.agreementText ??
        "I acknowledge that I have read, understood, and agree to abide by the policies, procedures, and rules set forth in the Paradise Washing Employee Handbook. I understand that violations may result in disciplinary action up to and including termination.",
      alreadySigned: Boolean(existingSig),
      signedAt: existingSig?.signedAt.toISOString() ?? null,
      signedPdfDownloadUrl: existingSig
        ? `/api/handbook-signatures/${existingSig.id}/pdf`
        : null,
    };
  }

  return (
    <SubjectViewerClient
      subjectId={subjectId}
      subjectTitle={subject.title}
      topics={serializedTopics}
      activeStepId={resolvedStepId}
      activeStepContent={
        activeStep ? (activeStep.content as object) : null
      }
      activeStepType={activeStep ? (activeStep.stepType as "CONTENT" | "PDF" | "SIGNATURE") : null}
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
      signatureStepData={signatureStepData}
    />
  );
}
