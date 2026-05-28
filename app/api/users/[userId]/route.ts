import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { notifyNewHireAssigned } from "@/lib/onboarding-notifications";

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

    // jobRoleIds: full replacement list of job roles for this user.
    // Fall back to legacy single jobRoleId for backwards-compat.
    let jobRoleIdsProvided = false;
    let jobRoleIds: string[] = [];
    if (Array.isArray(body.jobRoleIds)) {
      jobRoleIdsProvided = true;
      jobRoleIds = body.jobRoleIds.filter(
        (v: unknown): v is string => typeof v === "string" && v.length > 0 && v !== "none"
      );
    } else if (body.jobRoleId !== undefined) {
      jobRoleIdsProvided = true;
      jobRoleIds =
        body.jobRoleId && body.jobRoleId !== "none" ? [String(body.jobRoleId)] : [];
    }
    jobRoleIds = [...new Set(jobRoleIds)];

    // Snapshot existing role list so we can compute the "new role" diff
    // for auto-assigning subjects + firing notifications.
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        jobRoleId: true,
        jobRoles: { select: { jobRoleId: true } },
      },
    });
    const previousRoleIds = new Set(existing?.jobRoles.map((r) => r.jobRoleId) ?? []);

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
    if (jobRoleIdsProvided) {
      updateData.jobRoleId = jobRoleIds[0] ?? null; // legacy primary
    }

    // Apply user field updates first
    let user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Replace the UserJobRole join rows when a new list is given
    if (jobRoleIdsProvided) {
      await prisma.userJobRole.deleteMany({ where: { userId } });
      if (jobRoleIds.length > 0) {
        await prisma.userJobRole.createMany({
          data: jobRoleIds.map((id) => ({ userId, jobRoleId: id })),
          skipDuplicates: true,
        });
      }
    }

    // Re-fetch with relations for the response
    user = (await prisma.user.findUnique({
      where: { id: userId },
      include: { jobRole: true, jobRoles: { include: { jobRole: true } } },
    }))!;

    // Auto-assign subjects for any newly added job role
    const newlyAddedRoleIds = jobRoleIds.filter((id) => !previousRoleIds.has(id));
    if (newlyAddedRoleIds.length > 0) {
      const links = await prisma.jobRoleSubject.findMany({
        where: { jobRoleId: { in: newlyAddedRoleIds } },
        select: { subjectId: true },
      });
      const subjectIds = [...new Set(links.map((l) => l.subjectId))];
      if (subjectIds.length > 0) {
        await prisma.assignment.createMany({
          data: subjectIds.map((subjectId) => ({ userId, subjectId })),
          skipDuplicates: true,
        });
      }

      // Fire notification if the "New Hire / Onboarding" role was just added.
      // Awaited so it actually runs in Vercel serverless (fire-and-forget
      // promises get killed when the function returns).
      await notifyNewHireAssigned({
        newHireUserId: userId,
        newHireName: user.name,
        newHireEmail: user.email,
        assignedJobRoleIds: newlyAddedRoleIds,
      });
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
