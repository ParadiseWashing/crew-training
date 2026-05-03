import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ subjectId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subjectId } = await params;

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      topics: {
        include: {
          steps: { orderBy: { orderIndex: "asc" } },
          quiz: { include: { questions: { orderBy: { orderIndex: "asc" } }, attempts: { where: { userId: session.user.id } } } },
        },
        orderBy: { orderIndex: "asc" },
      },
      jobRoles: { include: { jobRole: true } },
      signOffs: { where: { userId: session.user.id } },
    },
  });

  if (!subject) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(subject);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ subjectId: string }> }) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { subjectId } = await params;
  const body = await req.json();

  const subject = await prisma.subject.update({
    where: { id: subjectId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
      ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
      ...(body.requiresSignOff !== undefined && { requiresSignOff: body.requiresSignOff }),
      ...(body.orderIndex !== undefined && { orderIndex: body.orderIndex }),
    },
  });

  return NextResponse.json(subject);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ subjectId: string }> }) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { subjectId } = await params;

  await prisma.subject.delete({ where: { id: subjectId } });
  return NextResponse.json({ success: true });
}
