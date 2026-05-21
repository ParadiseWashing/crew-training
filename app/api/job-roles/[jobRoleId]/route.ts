import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ jobRoleId: string }> }) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { jobRoleId } = await params;
  const body = await req.json();
  const { title, description, color, subjectIds, canAccessLeadership } = body;

  const updated = await prisma.jobRole.update({
    where: { id: jobRoleId },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(color && { color }),
      ...(canAccessLeadership !== undefined && { canAccessLeadership: Boolean(canAccessLeadership) }),
    },
  });

  if (subjectIds !== undefined) {
    await prisma.jobRoleSubject.deleteMany({ where: { jobRoleId } });
    if (subjectIds.length) {
      await prisma.jobRoleSubject.createMany({
        data: (subjectIds as string[]).map((subjectId: string) => ({ jobRoleId, subjectId })),
      });
    }
  }

  const result = await prisma.jobRole.findUnique({
    where: { id: jobRoleId },
    include: { subjects: { include: { subject: true } }, _count: { select: { users: true } } },
  });

  return NextResponse.json(result);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ jobRoleId: string }> }) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { jobRoleId } = await params;
  await prisma.jobRole.delete({ where: { id: jobRoleId } });
  return NextResponse.json({ success: true });
}
