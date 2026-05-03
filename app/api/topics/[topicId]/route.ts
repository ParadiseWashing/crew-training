import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ topicId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { topicId } = await params;
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      steps: { orderBy: { orderIndex: "asc" } },
      quiz: {
        include: {
          questions: { orderBy: { orderIndex: "asc" } },
          attempts: { where: { userId: session.user.id }, orderBy: { attemptNum: "desc" } },
        },
      },
    },
  });

  if (!topic) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(topic);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ topicId: string }> }) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { topicId } = await params;
  const body = await req.json();

  const topic = await prisma.topic.update({
    where: { id: topicId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.orderIndex !== undefined && { orderIndex: body.orderIndex }),
    },
  });

  return NextResponse.json(topic);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ topicId: string }> }) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { topicId } = await params;
  await prisma.topic.delete({ where: { id: topicId } });
  return NextResponse.json({ success: true });
}
