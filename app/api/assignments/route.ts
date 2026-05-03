import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || session.user.id;

  // Non-admins can only see their own
  if (session.user.systemRole !== "ADMIN" && userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assignments = await prisma.assignment.findMany({
    where: { userId },
    include: {
      subject: {
        include: {
          topics: {
            include: {
              steps: { select: { id: true } },
              quiz: { select: { id: true } },
            },
            orderBy: { orderIndex: "asc" },
          },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, subjectId, dueDate } = body;

  if (!userId || !subjectId) {
    return NextResponse.json({ error: "userId and subjectId required" }, { status: 400 });
  }

  const assignment = await prisma.assignment.upsert({
    where: { userId_subjectId: { userId, subjectId } },
    update: { ...(dueDate && { dueDate: new Date(dueDate) }) },
    create: { userId, subjectId, ...(dueDate && { dueDate: new Date(dueDate) }) },
  });

  return NextResponse.json(assignment, { status: 201 });
}
