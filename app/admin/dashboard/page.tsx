import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, CheckCircle, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";
import { formatRelativeTime, statusColor, statusLabel } from "@/lib/utils";

export default async function AdminDashboard() {
  const session = await auth();

  const [users, subjects, assignments, recentProgress] = await Promise.all([
    prisma.user.findMany({
      where: { systemRole: "TRAINEE" },
      include: {
        jobRole: true,
        assignments: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subject.findMany({
      include: { _count: { select: { assignments: true } } },
    }),
    prisma.assignment.findMany({
      include: { user: true, subject: true },
    }),
    prisma.stepProgress.findMany({
      include: {
        user: { select: { id: true, name: true } },
        step: { select: { title: true, topic: { select: { subject: { select: { title: true } } } } } },
      },
      orderBy: { completedAt: "desc" },
      take: 8,
    }),
  ]);

  const overallCompletion = assignments.length > 0
    ? Math.round(assignments.reduce((s, a) => s + a.progressPercentage, 0) / assignments.length)
    : 0;

  const publishedCount = subjects.filter((s) => s.isPublished).length;
  const completedAssignments = assignments.filter((a) => a.status === "COMPLETED").length;

  return (
    <div>
      <PageHeader
        title={`Good morning, ${session?.user.name?.split(" ")[0]} 👋`}
        description="Here's an overview of your team's training progress."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Crew"
          value={users.length}
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label="Overall Completion"
          value={`${overallCompletion}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label="Published Subjects"
          value={publishedCount}
          icon={<BookOpen className="h-5 w-5" />}
          color="purple"
        />
        <StatCard
          label="Completed Assignments"
          value={completedAssignments}
          icon={<CheckCircle className="h-5 w-5" />}
          color="amber"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* People table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Team Progress</CardTitle>
                <Link href="/admin/people" className="text-sm text-blue-500 hover:text-blue-600 font-medium">
                  View all →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {users.slice(0, 8).map((user) => {
                  const userAssignments = assignments.filter((a) => a.userId === user.id);
                  const avg = userAssignments.length > 0
                    ? Math.round(userAssignments.reduce((s, a) => s + a.progressPercentage, 0) / userAssignments.length)
                    : 0;

                  return (
                    <Link
                      key={user.id}
                      href={`/admin/people/${user.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <Avatar name={user.name} image={user.image} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 truncate">
                            {user.name}
                          </p>
                          {user.jobRole && (
                            <Badge className="hidden sm:inline-flex text-xs">
                              {user.jobRole.title}
                            </Badge>
                          )}
                        </div>
                        <Progress value={avg} size="sm" className="mt-1.5 max-w-48" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 flex-shrink-0">{avg}%</span>
                    </Link>
                  );
                })}
                {users.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No trainees yet. <Link href="/admin/people" className="text-blue-500">Add crew members</Link></p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Recent activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentProgress.slice(0, 6).map((p) => (
                  <div key={p.id} className="flex items-start gap-2.5">
                    <Avatar name={p.user.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600 leading-relaxed">
                        <span className="font-medium text-gray-800">{p.user.name}</span> completed{" "}
                        <span className="font-medium">{p.step.title}</span>
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(p.completedAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {recentProgress.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No activity yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Content overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content</CardTitle>
                <Link href="/admin/content" className="text-sm text-blue-500 hover:text-blue-600 font-medium">
                  Manage →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {subjects.slice(0, 5).map((subject) => (
                  <div key={subject.id} className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${subject.isPublished ? "bg-green-400" : "bg-gray-300"}`} />
                    <p className="text-sm text-gray-700 flex-1 truncate">{subject.title}</p>
                    <span className="text-xs text-gray-400">{subject._count.assignments}</span>
                  </div>
                ))}
                {subjects.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">
                    No subjects. <Link href="/admin/content" className="text-blue-500">Create one</Link>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
