import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ stepId: string }> }) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { stepId } = await params;
  const body = await req.json();

  const step = await prisma.step.update({
    where: { id: stepId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.orderIndex !== undefined && { orderIndex: body.orderIndex }),
      ...(body.stepType !== undefined && { stepType: body.stepType }),
    },
  });

  return NextResponse.json(step);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ stepId: string }> }) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { stepId } = await params;
  await prisma.step.delete({ where: { id: stepId } });
  return NextResponse.json({ success: true });
}
