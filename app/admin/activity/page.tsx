import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { getActivityFeed } from "@/lib/activity";
import { ActivityClient } from "./activity-client";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const session = await auth();
  if (!session || session.user.systemRole !== "ADMIN") redirect("/login");

  const events = await getActivityFeed(400);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity"
        description="Everything that has happened across the academy — training progress, quizzes, sign-offs, flags and admin actions."
      />
      <ActivityClient events={events} />
    </div>
  );
}
