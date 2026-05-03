import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    totalUsers,
    totalSubjects,
    publishedSubjects,
    assignments,
    quizAttempts,
    recentActivity,
  ] = await Promise.all([
    prisma.user.count({ where: { systemRole: "TRAINEE" } }),
    prisma.subject.count(),
    prisma.subject.count({ where: { isPublished: true } }),
    prisma.assignment.findMany({
      include: { user: { select: { id: true, name: true } }, subject: { select: { id: true, title: true } } },
    }),
    prisma.quizAttempt.findMany({
      include: {
        user: { select: { id: true, name: true } },
        quiz: { include: { topic: { select: { title: true, subjectId: true } } } },
      },
      orderBy: { takenAt: "desc" },
      take: 100,
    }),
    prisma.stepProgress.findMany({
      include: { user: { select: { id: true, name: true } }, step: { select: { title: true } } },
      orderBy: { completedAt: "desc" },
      take: 20,
    }),
  ]);

  const completedAssignments = assignments.filter((a) => a.status === "COMPLETED").length;
  const overallCompletion = assignments.length > 0
    ? Math.round((assignments.reduce((sum, a) => sum + a.progressPercentage, 0) / assignments.length))
    : 0;

  return NextResponse.json({
    summary: {
      totalUsers,
      totalSubjects,
      publishedSubjects,
      completedAssignments,
      overallCompletion,
    },
    assignments,
    quizAttempts,
    recentActivity,
  });
}
