import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { topicId, title, stepType } = body;

  if (!topicId || !title) {
    return NextResponse.json({ error: "topicId and title required" }, { status: 400 });
  }

  const type = stepType === "PDF" ? "PDF" : "CONTENT";

  const last = await prisma.step.findFirst({
    where: { topicId },
    orderBy: { orderIndex: "desc" },
  });

  const initialContent =
    type === "PDF"
      ? { type: "pdf", fileUrl: null, fileName: null }
      : { type: "doc", content: [] };

  const step = await prisma.step.create({
    data: {
      topicId,
      title,
      stepType: type,
      content: initialContent,
      orderIndex: (last?.orderIndex ?? -1) + 1,
    },
  });

  return NextResponse.json(step, { status: 201 });
}
