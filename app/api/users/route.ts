import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { notifyNewHireAssigned } from "@/lib/onboarding-notifications";

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
      jobRoles: { include: { jobRole: true } },
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

    // jobRoleIds is a string[] of selected role IDs (checklist). Fall back to
    // legacy single jobRoleId for backwards-compat with older clients.
    let jobRoleIds: string[] = [];
    if (Array.isArray(body.jobRoleIds)) {
      jobRoleIds = body.jobRoleIds.filter(
        (v: unknown): v is string => typeof v === "string" && v.length > 0 && v !== "none"
      );
    } else if (body.jobRoleId && body.jobRoleId !== "none") {
      jobRoleIds = [String(body.jobRoleId)];
    }
    // De-dupe
    jobRoleIds = [...new Set(jobRoleIds)];

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

    // Use the first selected role as the "primary" for backwards compat with
    // older read sites that use User.jobRole. All roles also go into the join.
    const primaryJobRoleId = jobRoleIds[0] ?? null;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        inviteToken,
        inviteStatus,
        inviteExpires,
        systemRole: systemRole || "TRAINEE",
        jobRoleId: primaryJobRoleId,
        jobRoles: {
          create: jobRoleIds.map((id) => ({ jobRoleId: id })),
        },
      },
      include: { jobRole: true, jobRoles: { include: { jobRole: true } } },
    });

    // Auto-assign subjects for every selected job role.
    if (jobRoleIds.length > 0) {
      const links = await prisma.jobRoleSubject.findMany({
        where: { jobRoleId: { in: jobRoleIds } },
        select: { subjectId: true },
      });
      const subjectIds = [...new Set(links.map((l) => l.subjectId))];
      if (subjectIds.length > 0) {
        await prisma.assignment.createMany({
          data: subjectIds.map((subjectId) => ({ userId: user.id, subjectId })),
          skipDuplicates: true,
        });
      }
    }

    // Notify Operational Managers if the New Hire / Onboarding role was assigned
    void notifyNewHireAssigned({
      newHireUserId: user.id,
      newHireName: user.name,
      newHireEmail: user.email,
      assignedJobRoleIds: jobRoleIds,
    });

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
