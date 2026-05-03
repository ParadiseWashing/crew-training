import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { topicId, passingScore, maxAttempts } = body;

  if (!topicId) return NextResponse.json({ error: "topicId required" }, { status: 400 });

  const quiz = await prisma.quiz.create({
    data: {
      topicId,
      passingScore: passingScore ?? 80,
      maxAttempts: maxAttempts ?? 3,
    },
  });

  return NextResponse.json(quiz, { status: 201 });
}
