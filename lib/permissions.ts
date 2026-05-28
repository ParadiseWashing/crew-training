// ─── Permission helpers ──────────────────────────────────────────────────────
//
// Centralizes flag-based permission checks now that users can have multiple
// JobRole assignments via the UserJobRole join table. A flag is granted if the
// user is an admin OR ANY of their assigned job roles has that flag.

import { prisma } from "./prisma";

export interface UserPermissions {
  isAdmin: boolean;
  canAccessLeadership: boolean;
  canSignOffTraining: boolean;
  /** Titles of all job roles assigned to this user (for display). */
  jobRoleTitles: string[];
}

export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      systemRole: true,
      jobRoles: {
        select: {
          jobRole: {
            select: { id: true, title: true, canAccessLeadership: true, canSignOffTraining: true },
          },
        },
      },
    },
  });

  if (!u) {
    return {
      isAdmin: false,
      canAccessLeadership: false,
      canSignOffTraining: false,
      jobRoleTitles: [],
    };
  }

  const isAdmin = u.systemRole === "ADMIN";
  const roles = u.jobRoles.map((r) => r.jobRole);

  return {
    isAdmin,
    canAccessLeadership: isAdmin || roles.some((r) => r.canAccessLeadership),
    canSignOffTraining: isAdmin || roles.some((r) => r.canSignOffTraining),
    jobRoleTitles: roles.map((r) => r.title).sort(),
  };
}

/**
 * Returns user IDs of all users who have a JobRole matching the given title.
 * Used for notifications targeting e.g. "Operational Manager".
 */
export async function findUsersByJobRoleTitle(title: string) {
  const rows = await prisma.userJobRole.findMany({
    where: { jobRole: { title } },
    select: { user: { select: { id: true, name: true, email: true } } },
  });
  return rows.map((r) => r.user);
}
