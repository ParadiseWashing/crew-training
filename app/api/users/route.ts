import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    include: {
      jobRole: true,
      assignments: {
        include: { subject: { select: { id: true, title: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Strip password hashes
  return NextResponse.json(users.map(({ passwordHash: _, ...u }) => u));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, systemRole, jobRoleId } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email, password required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      systemRole: systemRole || "TRAINEE",
      jobRoleId: jobRoleId || null,
    },
    include: { jobRole: true },
  });

  // Auto-assign subjects for the job role
  if (jobRoleId) {
    const jobRole = await prisma.jobRole.findUnique({
      where: { id: jobRoleId },
      include: { subjects: true },
    });

    if (jobRole?.subjects.length) {
      await prisma.assignment.createMany({
        data: jobRole.subjects.map((s) => ({
          userId: user.id,
          subjectId: s.subjectId,
        })),
        skipDuplicates: true,
      });
    }
  }

  const { passwordHash: _, ...safeUser } = user;
  return NextResponse.json(safeUser, { status: 201 });
}
