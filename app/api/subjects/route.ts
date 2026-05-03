import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const published = searchParams.get("published");

  const subjects = await prisma.subject.findMany({
    where: {
      ...(category && { category: category as "COMPANY" | "POLICIES" | "PROCESSES" }),
      ...(published === "true" && { isPublished: true }),
    },
    include: {
      topics: {
        include: { steps: { select: { id: true } }, quiz: { select: { id: true } } },
        orderBy: { orderIndex: "asc" },
      },
      jobRoles: { include: { jobRole: true } },
      _count: { select: { assignments: true } },
    },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(subjects);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, category, coverImage, requiresSignOff } = body;

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const subject = await prisma.subject.create({
    data: { title, description, category, coverImage, requiresSignOff: !!requiresSignOff },
  });

  return NextResponse.json(subject, { status: 201 });
}
