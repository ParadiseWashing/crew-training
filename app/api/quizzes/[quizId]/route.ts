import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ quizId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quizId } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { orderIndex: "asc" } },
      attempts: {
        where: { userId: session.user.id },
        orderBy: { attemptNum: "desc" },
      },
    },
  });

  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Strip correct answers for non-admin taking quiz
  if (session.user.systemRole !== "ADMIN") {
    return NextResponse.json({
      ...quiz,
      questions: quiz.questions.map(({ correctAnswer: _, ...q }) => q),
    });
  }

  return NextResponse.json(quiz);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ quizId: string }> }) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { quizId } = await params;
  const body = await req.json();
  const { passingScore, maxAttempts, questions } = body;

  await prisma.quiz.update({
    where: { id: quizId },
    data: {
      ...(passingScore !== undefined && { passingScore }),
      ...(maxAttempts !== undefined && { maxAttempts }),
    },
  });

  if (questions !== undefined) {
    // Replace all questions
    await prisma.question.deleteMany({ where: { quizId } });
    if (questions.length > 0) {
      await prisma.question.createMany({
        data: questions.map((q: Record<string, unknown>, i: number) => ({
          quizId,
          text: q.text,
          type: q.type,
          options: q.options || null,
          correctAnswer: q.correctAnswer || null,
          orderIndex: i,
        })),
      });
    }
  }

  const updated = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ quizId: string }> }) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { quizId } = await params;
  await prisma.quiz.delete({ where: { id: quizId } });
  return NextResponse.json({ success: true });
}
