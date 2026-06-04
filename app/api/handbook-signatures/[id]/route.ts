import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── DELETE /api/handbook-signatures/[id] ────────────────────────────────────
// Admin-only. Deletes a signature record and clears the signer's completion of
// that signature step, so the step re-opens and they can sign again. Used for
// testing and for removing erroneous signatures.

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requester = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { systemRole: true },
  });
  if (requester?.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const sig = await prisma.handbookSignature.findUnique({
    where: { id },
    select: { userId: true, stepId: true },
  });
  if (!sig) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.handbookSignature.delete({ where: { id } }),
    prisma.stepProgress.deleteMany({
      where: { userId: sig.userId, stepId: sig.stepId },
    }),
  ]);

  return NextResponse.json({ success: true });
}
