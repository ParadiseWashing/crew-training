import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { FlagsClient } from "./flags-client";

export const dynamic = "force-dynamic";

export default async function AuditFlagsPage() {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") redirect("/login");

  const flags = await prisma.trainingAuditFlag.findMany({
    where: { dismissed: false },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = flags.map((f) => ({
    id: f.id,
    flagType: f.flagType,
    subjectId: f.subjectId,
    topicId: f.topicId,
    stepId: f.stepId,
    quizId: f.quizId,
    details: f.details as Record<string, unknown> | null,
    createdAt: f.createdAt.toISOString(),
    user: f.user,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Flags"
        description="Trainees flagged for suspicious training behavior. Dismiss flags after review."
      />
      <FlagsClient flags={serialized} />
    </div>
  );
}
