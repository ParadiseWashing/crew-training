import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { subjectId, signedName } = body;

  if (!subjectId || !signedName?.trim()) {
    return NextResponse.json({ error: "subjectId and signedName required" }, { status: 400 });
  }

  const existing = await prisma.signOff.findFirst({
    where: { userId: session.user.id, subjectId },
  });

  if (existing) return NextResponse.json(existing);

  const signOff = await prisma.signOff.create({
    data: { userId: session.user.id, subjectId, signedName: signedName.trim() },
  });

  return NextResponse.json(signOff, { status: 201 });
}
