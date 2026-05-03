import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ error: "subjectId required" }, { status: 400 });

  const topics = await prisma.topic.findMany({
    where: { subjectId },
    include: {
      steps: { orderBy: { orderIndex: "asc" } },
      quiz: { include: { questions: { orderBy: { orderIndex: "asc" } } } },
    },
    orderBy: { orderIndex: "asc" },
  });

  return NextResponse.json(topics);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { subjectId, title, description } = body;

  if (!subjectId || !title) {
    return NextResponse.json({ error: "subjectId and title required" }, { status: 400 });
  }

  const last = await prisma.topic.findFirst({
    where: { subjectId },
    orderBy: { orderIndex: "desc" },
  });

  const topic = await prisma.topic.create({
    data: {
      subjectId,
      title,
      description,
      orderIndex: (last?.orderIndex ?? -1) + 1,
    },
  });

  return NextResponse.json(topic, { status: 201 });
}
