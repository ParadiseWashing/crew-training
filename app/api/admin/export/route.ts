import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  // Excel treats a leading =, +, - or @ as a formula — prefix to neutralise.
  const safe = /^[=+\-@]/.test(str) ? `'${str}` : str;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(","));
  }
  return lines.join("\r\n");
}

const DATASETS = {
  users: async (): Promise<Row[]> => {
    const users = await prisma.user.findMany({
      include: { jobRole: { select: { title: true } } },
      orderBy: { name: "asc" },
    });
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      systemRole: u.systemRole,
      jobRole: u.jobRole?.title ?? "",
      inviteStatus: u.inviteStatus,
      invitedAt: u.invitedAt,
      activatedAt: u.activatedAt,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
    }));
  },
  assignments: async (): Promise<Row[]> => {
    const rows = await prisma.assignment.findMany({
      include: {
        user: { select: { name: true, email: true } },
        subject: { select: { title: true } },
      },
      orderBy: { assignedAt: "desc" },
    });
    return rows.map((a) => ({
      id: a.id,
      trainee: a.user.name,
      email: a.user.email,
      subject: a.subject.title,
      status: a.status,
      progressPercentage: a.progressPercentage,
      dueDate: a.dueDate,
      assignedAt: a.assignedAt,
      completedAt: a.completedAt,
    }));
  },
  "quiz-attempts": async (): Promise<Row[]> => {
    const rows = await prisma.quizAttempt.findMany({
      include: {
        user: { select: { name: true, email: true } },
        quiz: {
          select: {
            passingScore: true,
            topic: { select: { title: true, subject: { select: { title: true } } } },
          },
        },
      },
      orderBy: { takenAt: "desc" },
    });
    return rows.map((a) => ({
      id: a.id,
      trainee: a.user.name,
      email: a.user.email,
      subject: a.quiz.topic.subject.title,
      topic: a.quiz.topic.title,
      attemptNum: a.attemptNum,
      score: a.score,
      passingScore: a.quiz.passingScore,
      passed: a.passed,
      timeTakenSeconds: a.timeTakenSeconds,
      takenAt: a.takenAt,
      writtenGraded: a.gradedAt ? "yes" : "no",
      gradedAt: a.gradedAt,
    }));
  },
  "step-progress": async (): Promise<Row[]> => {
    const rows = await prisma.stepProgress.findMany({
      include: {
        user: { select: { name: true, email: true } },
        step: {
          select: {
            title: true,
            topic: { select: { title: true, subject: { select: { title: true } } } },
          },
        },
      },
      orderBy: { completedAt: "desc" },
    });
    return rows.map((s) => ({
      id: s.id,
      trainee: s.user.name,
      email: s.user.email,
      subject: s.step.topic.subject.title,
      topic: s.step.topic.title,
      step: s.step.title,
      completedAt: s.completedAt,
      timeSpentSeconds: s.timeSpentSeconds,
      scrolledToBottom: s.scrolledToBottom,
    }));
  },
  "sign-offs": async (): Promise<Row[]> => {
    const rows = await prisma.signOff.findMany({
      include: {
        user: { select: { name: true, email: true } },
        subject: { select: { title: true } },
      },
      orderBy: { signedAt: "desc" },
    });
    return rows.map((s) => ({
      id: s.id,
      trainee: s.user.name,
      email: s.user.email,
      subject: s.subject.title,
      signedName: s.signedName,
      signedAt: s.signedAt,
    }));
  },
  "weekly-sign-offs": async (): Promise<Row[]> => {
    const rows = await prisma.weeklySignOff.findMany({
      include: {
        trainee: { select: { name: true, email: true } },
        trainer: { select: { name: true } },
        subject: { select: { title: true } },
      },
      orderBy: { signedAt: "desc" },
    });
    return rows.map((s) => ({
      id: s.id,
      trainee: s.trainee.name,
      email: s.trainee.email,
      subject: s.subject.title,
      weekNumber: s.weekNumber,
      decision: s.decision,
      trainer: s.trainer.name,
      trainerSignedName: s.trainerSignedName,
      topicRatings: s.topicRatings,
      notes: s.notes,
      signedAt: s.signedAt,
    }));
  },
  "handbook-signatures": async (): Promise<Row[]> => {
    const rows = await prisma.handbookSignature.findMany({
      select: {
        id: true,
        printedName: true,
        signedAt: true,
        signatureMethod: true,
        ipAddress: true,
        driveFileName: true,
        user: { select: { name: true, email: true } },
        step: { select: { title: true } },
      },
      orderBy: { signedAt: "desc" },
    });
    return rows.map((s) => ({
      id: s.id,
      trainee: s.user.name,
      email: s.user.email,
      document: s.step.title,
      printedName: s.printedName,
      signatureMethod: s.signatureMethod,
      ipAddress: s.ipAddress,
      driveFileName: s.driveFileName,
      signedAt: s.signedAt,
    }));
  },
  "working-interviews": async (): Promise<Row[]> => {
    const rows = await prisma.workingInterviewDay.findMany({
      include: {
        interview: { select: { candidateName: true, status: true, startedAt: true } },
        evaluator: { select: { name: true } },
      },
      orderBy: { submittedAt: "desc" },
    });
    return rows.map((d) => ({
      id: d.id,
      candidate: d.interview.candidateName,
      interviewStatus: d.interview.status,
      startedAt: d.interview.startedAt,
      day: d.day,
      decision: d.decision,
      evaluator: d.evaluator.name,
      autoDqFlags: d.autoDqFlags,
      ratings: d.ratings,
      notes: d.notes,
      submittedAt: d.submittedAt,
    }));
  },
  "audit-flags": async (): Promise<Row[]> => {
    const rows = await prisma.trainingAuditFlag.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((f) => ({
      id: f.id,
      trainee: f.user.name,
      email: f.user.email,
      flagType: f.flagType,
      details: f.details,
      dismissed: f.dismissed,
      dismissedAt: f.dismissedAt,
      createdAt: f.createdAt,
    }));
  },
  "admin-actions": async (): Promise<Row[]> => {
    const rows = await prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((l) => ({
      id: l.id,
      actor: l.actorName,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      summary: l.summary,
      metadata: l.metadata,
      createdAt: l.createdAt,
    }));
  },
} as const;

// Not exported — Next.js only permits its own reserved fields as route exports.
type ExportDataset = keyof typeof DATASETS;
const EXPORT_DATASETS = Object.keys(DATASETS) as ExportDataset[];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const dataset = searchParams.get("dataset") ?? "all";
  const stamp = new Date().toISOString().slice(0, 10);

  await logAdminAction({
    actorId: session.user.id,
    actorName: session.user.name ?? "Admin",
    action: "EXPORT_DATA",
    entityType: "Export",
    entityId: dataset,
    summary: `Exported "${dataset}" data`,
  });

  if (dataset === "all") {
    // One JSON archive containing every dataset — the closest thing to a full
    // backup we can produce without adding a zip dependency.
    const entries = await Promise.all(
      EXPORT_DATASETS.map(async (key) => [key, await DATASETS[key]()] as const)
    );
    const payload = {
      exportedAt: new Date().toISOString(),
      exportedBy: session.user.email,
      ...Object.fromEntries(entries),
    };
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="paradise-academy-export-${stamp}.json"`,
      },
    });
  }

  if (!(dataset in DATASETS)) {
    return NextResponse.json({ error: "Unknown dataset" }, { status: 400 });
  }

  const rows = await DATASETS[dataset as ExportDataset]();
  // BOM so Excel opens UTF-8 correctly.
  const csv = "\uFEFF" + toCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="paradise-academy-${dataset}-${stamp}.csv"`,
    },
  });
}
