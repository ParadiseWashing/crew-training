import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;

  // Users can only view their own profile unless admin
  if (session.user.systemRole !== "ADMIN" && session.user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      jobRole: true,
      assignments: {
        include: {
          subject: {
            include: {
              topics: {
                include: { steps: { select: { id: true } }, quiz: { select: { id: true } } },
                orderBy: { orderIndex: "asc" },
              },
            },
          },
        },
        orderBy: { assignedAt: "desc" },
      },
      quizAttempts: {
        include: { quiz: { include: { topic: { select: { title: true } } } } },
        orderBy: { takenAt: "desc" },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { passwordHash: _, ...safeUser } = user;
  return NextResponse.json(safeUser);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.systemRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await params;
    const body = await req.json();
    const { name, email, password, systemRole } = body;
    // Treat empty string / "none" / null as "no job role"
    const rawJobRoleId = body.jobRoleId;
    const normalizedJobRoleId =
      rawJobRoleId === undefined
        ? undefined
        : rawJobRoleId && rawJobRoleId !== "none"
          ? String(rawJobRoleId)
          : null;

    const oldUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { jobRoleId: true },
    });

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) {
      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }
    if (systemRole) updateData.systemRole = systemRole;
    if (normalizedJobRoleId !== undefined) updateData.jobRoleId = normalizedJobRoleId;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { jobRole: true },
    });

    // If job role changed, auto-assign new subjects
    if (normalizedJobRoleId && normalizedJobRoleId !== oldUser?.jobRoleId) {
      const jobRole = await prisma.jobRole.findUnique({
        where: { id: normalizedJobRoleId },
        include: { subjects: true },
      });

      if (jobRole?.subjects.length) {
        await prisma.assignment.createMany({
          data: jobRole.subjects.map((s) => ({
            userId,
            subjectId: s.subjectId,
          })),
          skipDuplicates: true,
        });
      }
    }

    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch (err) {
    console.error("[users:update]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req2: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ success: true });
}
