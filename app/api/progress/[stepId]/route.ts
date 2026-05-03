import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_: NextRequest, { params }: { params: Promise<{ stepId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stepId } = await params;

  // Mark step as complete
  await prisma.stepProgress.upsert({
    where: { userId_stepId: { userId: session.user.id, stepId } },
    update: {},
    create: { userId: session.user.id, stepId },
  });

  // Recalculate assignment progress
  const step = await prisma.step.findUnique({
    where: { id: stepId },
    include: {
      topic: {
        include: {
          subject: {
            include: {
              topics: { include: { steps: { select: { id: true } } } },
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
    const status = percentage === 0 ? "NOT_STARTED" : percentage === 100 ? "COMPLETED" : "IN_PROGRESS";

    await prisma.assignment.updateMany({
      where: { userId: session.user.id, subjectId: subject.id },
      data: {
        progressPercentage: percentage,
        status,
        ...(status === "COMPLETED" && { completedAt: new Date() }),
      },
    });
  }

  return NextResponse.json({ success: true });
}
