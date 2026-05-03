import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, FileText, HelpCircle, Settings } from "lucide-react";
import {
  AddStepButton,
  DeleteStepButton,
  StepEditor,
  QuizBuilder,
  CreateQuizButton,
  EditTopicForm,
} from "./topic-detail-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ subjectId: string; topicId: string }>;
}

export default async function TopicDetailPage({ params }: PageProps) {
  await auth();
  const { subjectId, topicId } = await params;

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      subject: { select: { id: true, title: true } },
      steps: { orderBy: { orderIndex: "asc" } },
      quiz: {
        include: {
          questions: { orderBy: { orderIndex: "asc" } },
        },
      },
    },
  });

  if (!topic || topic.subjectId !== subjectId) notFound();

  // Serialize steps for client components (JSON content field)
  const serializedSteps = topic.steps.map((step) => ({
    id: step.id,
    title: step.title,
    content: step.content as object,
    orderIndex: step.orderIndex,
  }));

  const serializedQuiz = topic.quiz
    ? {
        id: topic.quiz.id,
        passingScore: topic.quiz.passingScore,
        maxAttempts: topic.quiz.maxAttempts,
        questions: topic.quiz.questions.map((q) => ({
          id: q.id,
          text: q.text,
          type: q.type as "MULTIPLE_CHOICE" | "MULTIPLE_SELECT" | "TRUE_FALSE" | "WRITTEN_RESPONSE",
          options: q.options as string[] | null,
          correctAnswer: q.correctAnswer as string | string[] | null,
          orderIndex: q.orderIndex,
        })),
      }
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: "Content", href: "/admin/content" },
            { label: topic.subject.title, href: `/admin/content/${subjectId}` },
            { label: topic.title },
          ]}
        />
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-gray-900">{topic.title}</h1>
          {topic.quiz && (
            <Badge variant="info" className="flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />
              Quiz Attached
            </Badge>
          )}
        </div>
        {topic.description && (
          <p className="text-sm text-gray-500 mt-1">{topic.description}</p>
        )}
      </div>

      {/* Main layout */}
      <div className="grid lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Left sidebar — step list */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-gray-400" />
              Steps ({topic.steps.length})
            </h2>
            <AddStepButton topicId={topicId} />
          </div>

          {topic.steps.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No steps yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1">
              {topic.steps.map((step, idx) => (
                <Card
                  key={step.id}
                  className="group hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <GripVertical className="h-3.5 w-3.5 text-gray-200 flex-shrink-0" />
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500 flex-shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-xs font-medium text-gray-700 flex-1 truncate group-hover:text-blue-600 transition-colors">
                      {step.title}
                    </p>
                    <DeleteStepButton stepId={step.id} stepTitle={step.title} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Center — step editor + quiz */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step editor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Step Content</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {topic.steps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <FileText className="h-6 w-6 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400">Add a step to start editing content</p>
                </div>
              ) : (
                <StepEditor steps={serializedSteps} />
              )}
            </CardContent>
          </Card>

          {/* Quiz section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-gray-400" />
                  Quiz
                </CardTitle>
                {!topic.quiz && <CreateQuizButton topicId={topicId} />}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {topic.quiz ? (
                <QuizBuilder quiz={serializedQuiz!} />
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                    <HelpCircle className="h-6 w-6 text-blue-300" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">No quiz yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Add a quiz to test trainees on this topic
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right panel — topic settings */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-400" />
                Topic Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <EditTopicForm
                topic={{
                  id: topicId,
                  title: topic.title,
                  description: topic.description ?? "",
                }}
              />
            </CardContent>
          </Card>

          {/* Quiz settings */}
          {topic.quiz && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quiz Settings</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Passing Score</span>
                    <span className="font-semibold text-gray-900">{topic.quiz.passingScore}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Max Attempts</span>
                    <span className="font-semibold text-gray-900">{topic.quiz.maxAttempts}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Questions</span>
                    <span className="font-semibold text-gray-900">{topic.quiz.questions.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
