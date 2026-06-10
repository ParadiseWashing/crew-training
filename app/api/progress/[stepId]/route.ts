import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Rough estimate: ~400 words/min reading speed (kept in sync with the
// client reading gate, which was halved from the prior 200 wpm pace).
function estimatedReadingSeconds(content: unknown): number {
  if (!content || typeof content !== "object") return 0;
  const text = JSON.stringify(content);
  // Extract word-like tokens from the JSON text values
  const words = text.match(/[a-zA-Z]{2,}/g)?.length ?? 0;
  return Math.max(Math.ceil((words / 400) * 60), 8);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ stepId: string }> }) {
  try {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stepId } = await params;
  const body = await req.json().catch(() => ({}));
  const timeSpentSeconds: number = typeof body.timeSpentSeconds === "number" ? body.timeSpentSeconds : 0;
  const scrolledToBottom: boolean = body.scrolledToBottom === true;

  // Mark step as complete (store time + scroll metadata)
  await prisma.stepProgress.upsert({
    where: { userId_stepId: { userId: session.user.id, stepId } },
    update: { timeSpentSeconds, scrolledToBottom },
    create: { userId: session.user.id, stepId, timeSpentSeconds, scrolledToBottom },
  });

  // Recalculate assignment progress
  const step = await prisma.step.findUnique({
    where: { id: stepId },
    include: {
      topic: {
        include: {
          subject: {
            include: {
              topics: { include: { steps: { select: { id: true, content: true } } } },
            },
          },
        },
      },
    },
  });

  if (step) {
    const subject = step.topic.subject;
    const allStepIds = subject.topics.flatMap((t) => t.steps.map((s) => s.id));
    const completedCount = await prisma.stepProgress.count({
      where: { userId: session.user.id, stepId: { in: allStepIds } },
    });

    const total = allStepIds.length;
    const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    // The subject is only COMPLETED when all steps are done AND every topic
    // quiz has been passed — otherwise it stays IN_PROGRESS.
    let allQuizzesPassed = true;
    if (percentage === 100) {
      const quizzes = await prisma.quiz.findMany({
        where: { topic: { subjectId: subject.id } },
        select: {
          id: true,
          attempts: {
            where: { userId: session.user.id, passed: true },
            select: { id: true },
            take: 1,
          },
        },
      });
      allQuizzesPassed = quizzes.every((q) => q.attempts.length > 0);
    }

    const status =
      percentage === 0
        ? "NOT_STARTED"
        : percentage === 100 && allQuizzesPassed
          ? "COMPLETED"
          : "IN_PROGRESS";

    await prisma.assignment.updateMany({
      where: { userId: session.user.id, subjectId: subject.id },
      data: {
        progressPercentage: percentage,
        status,
        ...(status === "COMPLETED" && { completedAt: new Date() }),
      },
    });

    // ── Audit: SPEED_READ flag ──────────────────────────────────────────────
    const stepContent = step.content;
    const expected = estimatedReadingSeconds(stepContent);
    // Flag if they completed in under 50% of expected reading time (and expected > 20s)
    if (expected > 20 && timeSpentSeconds < expected * 0.5) {
      await prisma.trainingAuditFlag.create({
        data: {
          userId: session.user.id,
          flagType: "SPEED_READ",
          subjectId: subject.id,
          topicId: step.topicId,
          stepId,
          details: {
            expectedSeconds: expected,
            actualSeconds: timeSpentSeconds,
            scrolledToBottom,
            stepTitle: step.title,
          },
        },
      });
    }
  }

  return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[progress API error]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
