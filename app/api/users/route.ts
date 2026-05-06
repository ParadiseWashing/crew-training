import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const INVITE_EXPIRY_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function GET() {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    include: {
      jobRole: true,
      assignments: {
        include: { subject: { select: { id: true, title: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Strip password hashes and invite tokens
  return NextResponse.json(
    users.map(({ passwordHash: _ph, inviteToken: _it, ...u }) => u)
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.systemRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, systemRole } = body;
    // Treat empty string / "none" / null as "no job role"
    const rawJobRoleId = body.jobRoleId;
    const jobRoleId =
      rawJobRoleId && rawJobRoleId !== "none" ? String(rawJobRoleId) : null;

    if (!name || !email) {
      return NextResponse.json({ error: "name, email required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

    // If a password is provided, the account is immediately usable.
    // If not, generate an invite token — the user must accept the invite
    // and set their own password before they can log in.
    let passwordHash: string | null = null;
    let inviteToken: string | null = null;
    let inviteStatus: "PENDING" | "ACCEPTED" = "ACCEPTED";
    let inviteExpires: Date | null = null;

    if (password) {
      if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }
      passwordHash = await bcrypt.hash(password, 12);
    } else {
      inviteToken = randomBytes(32).toString("hex");
      inviteStatus = "PENDING";
      inviteExpires = new Date(Date.now() + INVITE_EXPIRY_DAYS * MS_PER_DAY);
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        inviteToken,
        inviteStatus,
        inviteExpires,
        systemRole: systemRole || "TRAINEE",
        jobRoleId,
      },
      include: { jobRole: true },
    });

    // Auto-assign subjects for the job role
    if (jobRoleId) {
      const jobRole = await prisma.jobRole.findUnique({
        where: { id: jobRoleId },
        include: { subjects: true },
      });

      if (jobRole?.subjects.length) {
        await prisma.assignment.createMany({
          data: jobRole.subjects.map((s) => ({
            userId: user.id,
            subjectId: s.subjectId,
          })),
          skipDuplicates: true,
        });
      }
    }

    const { passwordHash: _ph, inviteToken: _it, ...safeUser } = user;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (err) {
    console.error("[users:create]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
