import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { Users, Briefcase, BookOpen } from "lucide-react";
import Link from "next/link";
import {
  CreateUserButton,
  EditUserButton,
  DeleteUserButton,
  CreateJobRoleButton,
  EditJobRoleButton,
  DeleteJobRoleButton,
} from "./people-client";

export default async function PeoplePage() {
  await auth();

  const [users, jobRoles, subjects] = await Promise.all([
    prisma.user.findMany({
      include: {
        jobRole: true,
        assignments: true,
        stepProgress: { orderBy: { completedAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.jobRole.findMany({
      include: {
        subjects: { include: { subject: { select: { id: true, title: true } } } },
        _count: { select: { users: true } },
      },
      orderBy: { title: "asc" },
    }),
    prisma.subject.findMany({
      where: { isPublished: true },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="People"
        description="Manage your team members and job roles."
        actions={
          <div className="flex items-center gap-2">
            <CreateJobRoleButton subjects={subjects} />
            <CreateUserButton jobRoles={jobRoles} />
          </div>
        }
      />

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">
            Employees ({users.length})
          </TabsTrigger>
          <TabsTrigger value="job-roles">
            Job Roles ({jobRoles.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Employees Tab ── */}
        <TabsContent value="employees">
          <Card>
            <CardContent className="p-0">
              {users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Users className="h-7 w-7 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">No employees yet</p>
                  <p className="text-sm text-gray-500 mb-4">Add your first team member to get started.</p>
                  <CreateUserButton jobRoles={jobRoles} />
                </div>
              ) : (
                <>
                  {/* Table header — desktop */}
                  <div className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1.5fr_1fr_auto] gap-4 px-6 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span>Name</span>
                    <span>Email</span>
                    <span>Role</span>
                    <span>Progress</span>
                    <span>Last Active</span>
                    <span />
                  </div>

                  <div className="divide-y divide-gray-100">
                    {users.map((user) => {
                      const avgProgress =
                        user.assignments.length > 0
                          ? Math.round(
                              user.assignments.reduce(
                                (s, a) => s + a.progressPercentage,
                                0
                              ) / user.assignments.length
                            )
                          : 0;

                      const lastActive =
                        user.stepProgress[0]?.completedAt ?? user.updatedAt;

                      return (
                        <div
                          key={user.id}
                          className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1.5fr_1.5fr_1fr_auto] gap-2 md:gap-4 items-center px-6 py-4 hover:bg-gray-50 transition-colors"
                        >
                          {/* Name + avatar */}
                          <div className="flex items-center gap-3">
                            <Avatar name={user.name} image={user.image} size="md" />
                            <div className="min-w-0">
                              <Link
                                href={`/admin/people/${user.id}`}
                                className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate block"
                              >
                                {user.name}
                              </Link>
                              <span className="text-xs text-gray-400">
                                {user.systemRole === "ADMIN" ? "Admin" : "Trainee"}
                              </span>
                            </div>
                          </div>

                          {/* Email */}
                          <span className="text-sm text-gray-600 truncate hidden md:block">
                            {user.email}
                          </span>

                          {/* Job Role */}
                          <div>
                            {user.jobRole ? (
                              <Badge
                                variant="info"
                                style={
                                  user.jobRole.color
                                    ? {
                                        backgroundColor: `${user.jobRole.color}20`,
                                        color: user.jobRole.color,
                                      }
                                    : undefined
                                }
                              >
                                {user.jobRole.title}
                              </Badge>
                            ) : (
                              <span className="text-xs text-gray-400">No role</span>
                            )}
                          </div>

                          {/* Progress */}
                          <div className="flex items-center gap-2 min-w-0">
                            <Progress value={avgProgress} size="sm" className="flex-1" />
                            <span className="text-xs font-medium text-gray-500 w-8 flex-shrink-0 text-right">
                              {avgProgress}%
                            </span>
                          </div>

                          {/* Last active */}
                          <span className="text-xs text-gray-400 hidden md:block">
                            {formatDate(lastActive)}
                          </span>

                          {/* Actions */}
                          <div className="flex items-center gap-1 justify-end">
                            <Link
                              href={`/admin/people/${user.id}`}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="View profile"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </Link>
                            <EditUserButton user={user} jobRoles={jobRoles} />
                            <DeleteUserButton userId={user.id} userName={user.name} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Job Roles Tab ── */}
        <TabsContent value="job-roles">
          {jobRoles.length === 0 ? (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Briefcase className="h-7 w-7 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">No job roles yet</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Create job roles to group employees and auto-assign training subjects.
                  </p>
                  <CreateJobRoleButton subjects={subjects} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobRoles.map((role) => (
                <Card key={role.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: role.color ?? "#3B82F6" }}
                        />
                        <CardTitle className="text-base truncate">{role.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <EditJobRoleButton role={role} subjects={subjects} />
                        <DeleteJobRoleButton roleId={role.id} roleTitle={role.title} />
                      </div>
                    </div>
                    {role.description && (
                      <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">
                        {role.description}
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="pt-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                      <Users className="h-4 w-4" />
                      <span>
                        {role._count.users}{" "}
                        {role._count.users === 1 ? "employee" : "employees"}
                      </span>
                    </div>

                    {role.subjects.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                          Assigned Subjects
                        </p>
                        <div className="space-y-1.5">
                          {role.subjects.map(({ subject }) => (
                            <div
                              key={subject.id}
                              className="flex items-center gap-2 text-sm text-gray-700"
                            >
                              <BookOpen className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{subject.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">No subjects assigned</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
