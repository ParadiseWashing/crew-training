import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: { id: string; orderIndex: number }[] = await req.json();

  await prisma.$transaction(
    body.map(({ id, orderIndex }) =>
      prisma.step.update({ where: { id }, data: { orderIndex } })
    )
  );

  return NextResponse.json({ success: true });
}
