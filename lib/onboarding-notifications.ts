// ─── Onboarding notifications ────────────────────────────────────────────────
//
// When a user is assigned the "New Hire / Onboarding" JobRole, notify every
// user whose JobRole.title is "Operational Manager" so they can begin the
// 4-week training sign-off cycle (Lance, Brandon, etc).

import { prisma } from "./prisma";
import { findUsersByJobRoleTitle } from "./permissions";
import { sendNewHireNotificationEmail } from "./email";

const NEW_HIRE_ROLE_TITLE = "New Hire / Onboarding";
const TRAINER_ROLE_TITLE = "Operational Manager";

interface NotifyArgs {
  newHireUserId: string;
  newHireName: string;
  newHireEmail: string;
  /** Job role IDs that were just newly added to this user. */
  assignedJobRoleIds: string[];
}

export async function notifyNewHireAssigned(args: NotifyArgs) {
  try {
    if (!args.assignedJobRoleIds.length) return;

    // Check whether one of the newly added roles is the New Hire / Onboarding role
    const newHireRole = await prisma.jobRole.findFirst({
      where: { title: NEW_HIRE_ROLE_TITLE },
      select: { id: true },
    });
    if (!newHireRole) return;
    if (!args.assignedJobRoleIds.includes(newHireRole.id)) return;

    // Find every Operational Manager (recipients)
    const managers = await findUsersByJobRoleTitle(TRAINER_ROLE_TITLE);
    if (managers.length === 0) {
      console.warn(
        "[onboarding-notify] No users found with JobRole.title='Operational Manager'; skipping email."
      );
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://paradiseacademy.vercel.app";

    await Promise.all(
      managers.map((m) =>
        sendNewHireNotificationEmail({
          recipientName: m.name,
          recipientEmail: m.email,
          newHireName: args.newHireName,
          newHireEmail: args.newHireEmail,
          appUrl,
        })
      )
    );

    console.log(
      `[onboarding-notify] Notified ${managers.length} Operational Manager(s) about new hire ${args.newHireName}`
    );
  } catch (err) {
    // Notifications should NEVER break the user save. Just log.
    console.error("[onboarding-notify] error:", err);
  }
}
