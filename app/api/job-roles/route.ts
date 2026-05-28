import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = await prisma.jobRole.findMany({
    include: {
      subjects: { include: { subject: true } },
      _count: { select: { users: true } },
    },
    orderBy: { title: "asc" },
  });

  return NextResponse.json(roles);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, color, subjectIds, canAccessLeadership, canSignOffTraining } = body;

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const jobRole = await prisma.jobRole.create({
    data: {
      title,
      description,
      color: color || "#F08A3E",
      canAccessLeadership: Boolean(canAccessLeadership),
      canSignOffTraining: Boolean(canSignOffTraining),
      subjects: subjectIds?.length
        ? { create: (subjectIds as string[]).map((id: string) => ({ subjectId: id })) }
        : undefined,
    },
    include: { subjects: { include: { subject: true } } },
  });

  return NextResponse.json(jobRole, { status: 201 });
}
