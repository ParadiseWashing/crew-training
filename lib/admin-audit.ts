import { prisma } from "@/lib/prisma";

export type AdminAuditAction =
  | "GRADE_WRITTEN_RESPONSE"
  | "EDIT_WORKING_INTERVIEW_DAY"
  | "DELETE_WORKING_INTERVIEW_DAY"
  | "DELETE_WORKING_INTERVIEW"
  | "DELETE_WEEKLY_SIGNOFF"
  | "RESET_SUBJECT_PROGRESS"
  | "RESET_ALL_PROGRESS"
  | "DELETE_USER"
  | "DELETE_ALL_TRAINEES"
  | "EXPORT_DATA";

interface LogInput {
  actorId: string;
  actorName: string;
  action: AdminAuditAction;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

/**
 * Append-only record of destructive or otherwise irreversible admin actions.
 * Never throws — an audit write must not be able to fail the operation it
 * describes, but a failure is surfaced in the server logs.
 */
export async function logAdminAction(input: LogInput) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: input.actorId,
        actorName: input.actorName,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        summary: input.summary,
        metadata: (input.metadata ?? undefined) as never,
      },
    });
  } catch (err) {
    console.error("[admin-audit] failed to write log entry", input.action, err);
  }
}
