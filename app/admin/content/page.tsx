import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, FileText, CheckCircle2, Layers } from "lucide-react";
import Link from "next/link";
import { categoryLabel, categoryColor } from "@/lib/utils";
import { CreateSubjectButton, DeleteSubjectButton } from "./subjects-client";

export const dynamic = "force-dynamic";

const categoryGradients: Record<string, string> = {
  COMPANY: "from-purple-500 to-indigo-600",
  POLICIES: "from-amber-400 to-orange-500",
  PROCESSES: "from-accent to-accent-hover",
};

export default async function ContentPage() {
  await auth();

  const subjects = await prisma.subject.findMany({
    include: {
      topics: {
        include: {
          steps: { select: { id: true } },
          quiz: { select: { id: true } },
        },
        orderBy: { orderIndex: "asc" },
      },
      jobRoles: { include: { jobRole: true } },
      _count: { select: { assignments: true } },
    },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "desc" }],
  });

  const publishedCount = subjects.filter((s) => s.isPublished).length;
  const draftCount = subjects.length - publishedCount;

  const categories = ["ALL", "COMPANY", "POLICIES", "PROCESSES"] as const;

  function SubjectGrid({ items }: { items: typeof subjects }) {
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">No subjects found</p>
          <p className="text-xs text-gray-400 mt-1">Create a subject to get started</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((subject) => {
          const topicCount = subject.topics.length;
          const gradient = categoryGradients[subject.category] ?? "from-gray-400 to-gray-600";

          return (
            <Card key={subject.id} className="overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
              {/* Cover image / gradient placeholder */}
              <div className={`relative h-32 bg-gradient-to-br ${gradient} flex items-end p-4`}>
                <div className="absolute inset-0 bg-black/10" />
                {subject.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={subject.coverImage}
                    alt={subject.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <Layers className="absolute top-4 right-4 h-8 w-8 text-white/40" />
                )}
                <div className="relative flex items-center gap-2">
                  <Badge
                    className={`${categoryColor(subject.category)} border-0 text-xs`}
                  >
                    {categoryLabel(subject.category)}
                  </Badge>
                  {subject.isPublished ? (
                    <Badge variant="success" className="text-xs">Published</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-white/90">Draft</Badge>
                  )}
                </div>
              </div>

              {/* Content */}
              <CardContent className="pt-4 flex-1">
                <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                  {subject.title}
                </h3>
                {subject.description && (
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{subject.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <FileText className="h-3.5 w-3.5" />
                    {topicCount} {topicCount === 1 ? "topic" : "topics"}
                  </span>
                  {subject.requiresSignOff && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Sign-off
                    </span>
                  )}
                </div>
              </CardContent>

              <CardFooter className="gap-2">
                <Link href={`/admin/content/${subject.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    Edit
                  </Button>
                </Link>
                <DeleteSubjectButton subjectId={subject.id} subjectTitle={subject.title} />
              </CardFooter>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Training Content"
        description="Manage subjects, topics, and learning steps for your crew."
        actions={<CreateSubjectButton />}
      />

      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-accent-tint flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Subjects</p>
            <p className="text-lg font-bold text-gray-900 leading-none">{subjects.length}</p>
          </div>
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Published</p>
            <p className="text-lg font-bold text-gray-900 leading-none">{publishedCount}</p>
          </div>
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center">
            <FileText className="h-4 w-4 text-gray-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Drafts</p>
            <p className="text-lg font-bold text-gray-900 leading-none">{draftCount}</p>
          </div>
        </div>
      </div>

      {/* Category filter tabs */}
      <Tabs defaultValue="ALL">
        <TabsList className="mb-6">
          {categories.map((cat) => {
            const count =
              cat === "ALL"
                ? subjects.length
                : subjects.filter((s) => s.category === cat).length;
            return (
              <TabsTrigger key={cat} value={cat} className="gap-1.5">
                {cat === "ALL" ? "All" : categoryLabel(cat)}
                <span className="text-xs opacity-60">({count})</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="ALL">
          <SubjectGrid items={subjects} />
        </TabsContent>
        {(["COMPANY", "POLICIES", "PROCESSES"] as const).map((cat) => (
          <TabsContent key={cat} value={cat}>
            <SubjectGrid items={subjects.filter((s) => s.category === cat)} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
