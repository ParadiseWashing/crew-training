import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_: NextRequest, { params }: { params: Promise<{ flagId: string }> }) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { flagId } = await params;

  const flag = await prisma.trainingAuditFlag.update({
    where: { id: flagId },
    data: {
      dismissed: true,
      dismissedBy: session.user.id,
      dismissedAt: new Date(),
    },
  });

  return NextResponse.json(flag);
}
