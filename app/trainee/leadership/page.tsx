import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPermissions } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LeadershipLandingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const perms = await getUserPermissions(session.user.id);
  if (!perms.canAccessLeadership) notFound();

  // Pull a couple of counters to show on the tile.
  const [inProgress, completed] = await Promise.all([
    prisma.workingInterview.count({ where: { status: "IN_PROGRESS" } }),
    prisma.workingInterview.count({ where: { status: { in: ["PASSED", "DISQUALIFIED"] } } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Leadership</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Crew Lead Workflows</h1>
        <p className="text-sm text-gray-500 mt-1">
          Forms and modules for crew leads and operational managers.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/trainee/leadership/working-interview" className="block group">
          <Card className="hover:border-accent-soft hover:shadow-md transition-all h-full">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-accent-tint flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-gray-900 group-hover:text-accent transition-colors">
                    Three Day Working Interview
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Start a candidate&rsquo;s 3-day trial. One form per day. Day-by-day Continue
                    or DQ verdict.
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                      {inProgress} in progress
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                      {completed} completed
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-accent transition-colors flex-shrink-0 mt-1" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
