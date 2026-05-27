import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, Breadcrumb } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  BookOpen,
  Settings,
} from "lucide-react";
import { categoryLabel, categoryColor } from "@/lib/utils";
import {
  PublishToggle,
  AddTopicButton,
  EditSubjectForm,
  SortableTopicList,
} from "./subject-detail-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ subjectId: string }>;
}

export default async function SubjectDetailPage({ params }: PageProps) {
  await auth();
  const { subjectId } = await params;

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      topics: {
        include: {
          steps: { select: { id: true }, orderBy: { orderIndex: "asc" } },
          quiz: { select: { id: true, passingScore: true } },
        },
        orderBy: { orderIndex: "asc" },
      },
      jobRoles: { include: { jobRole: true } },
    },
  });

  if (!subject) notFound();

  const allJobRoles = await prisma.jobRole.findMany({ orderBy: { title: "asc" } });

  return (
    <div>
      <PageHeader
        title={subject.title}
        description={subject.description ?? undefined}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: "Content", href: "/admin/content" },
              { label: subject.title },
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge className={`${categoryColor(subject.category)} border-0`}>
              {categoryLabel(subject.category)}
            </Badge>
            <PublishToggle
              subjectId={subject.id}
              isPublished={subject.isPublished}
            />
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column — topic list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">
                Topics
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({subject.topics.length})
                </span>
              </h2>
            </div>
            <AddTopicButton subjectId={subject.id} />
          </div>

          {subject.topics.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <FileText className="h-7 w-7 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">No topics yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Add a topic to start building this subject
                </p>
              </CardContent>
            </Card>
          ) : (
            <SortableTopicList
              subjectId={subject.id}
              topics={subject.topics.map((t) => ({
                id: t.id,
                title: t.title,
                weekNumber: t.weekNumber,
                dayNumber: t.dayNumber,
                stepCount: t.steps.length,
                quiz: t.quiz ? { id: t.quiz.id, passingScore: t.quiz.passingScore } : null,
              }))}
            />
          )}
        </div>

        {/* Right column — settings panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-400" />
                <CardTitle className="text-base">Subject Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <EditSubjectForm
                subject={{
                  id: subject.id,
                  title: subject.title,
                  description: subject.description ?? "",
                  coverImage: subject.coverImage ?? "",
                  category: subject.category,
                  requiresSignOff: subject.requiresSignOff,
                  jobRoleIds: subject.jobRoles.map((jr) => jr.jobRoleId),
                }}
                allJobRoles={allJobRoles.map((jr) => ({ id: jr.id, title: jr.title }))}
              />
            </CardContent>
          </Card>

          {/* Assigned job roles summary */}
          {subject.jobRoles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assigned To</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {subject.jobRoles.map(({ jobRole }) => (
                    <Badge key={jobRole.id} variant="info">
                      {jobRole.title}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
