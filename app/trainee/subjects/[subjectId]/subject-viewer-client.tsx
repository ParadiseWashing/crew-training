"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Menu,
  X,
  HelpCircle,
  PenLine,
  BookOpen,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepMeta {
  id: string;
  title: string;
  orderIndex: number;
  topicId: string;
  completed: boolean;
}

interface QuizMeta {
  id: string;
  passingScore: number;
  maxAttempts: number;
  attemptCount: number;
  passed: boolean;
  lastScore: number | null;
}

interface TopicMeta {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  steps: StepMeta[];
  quiz: QuizMeta | null;
  allStepsComplete: boolean;
}

interface SubjectViewerClientProps {
  subjectId: string;
  subjectTitle: string;
  topics: TopicMeta[];
  activeStepId: string | null;
  activeStepContent: object | null;
  activeStepTitle: string | null;
  allStepsComplete: boolean;
  requiresSignOff: boolean;
  existingSignOff: { signedName: string; signedAt: string } | null;
  userId: string;
  userName: string;
}

// ─── Content Renderer ─────────────────────────────────────────────────────────

type TiptapNode = {
  type?: string;
  text?: string;
  content?: TiptapNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  attrs?: Record<string, unknown>;
};

function renderMarks(node: TiptapNode): React.ReactNode {
  let el: React.ReactNode = node.text ?? "";
  if (!node.marks) return el;
  for (const mark of node.marks) {
    if (mark.type === "bold") el = <strong key={mark.type}>{el}</strong>;
    else if (mark.type === "italic") el = <em key={mark.type}>{el}</em>;
    else if (mark.type === "underline") el = <u key={mark.type}>{el}</u>;
    else if (mark.type === "code")
      el = (
        <code
          key={mark.type}
          className="bg-gray-100 text-gray-800 rounded px-1 py-0.5 text-sm font-mono"
        >
          {el}
        </code>
      );
    else if (mark.type === "link") {
      const href = (mark.attrs?.href as string) ?? "#";
      el = (
        <a
          key={mark.type}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline hover:text-blue-700"
        >
          {el}
        </a>
      );
    }
  }
  return el;
}

function renderNode(node: TiptapNode, idx: number): React.ReactNode {
  const children = node.content?.map((c, i) => renderNode(c, i)) ?? [];

  switch (node.type) {
    case "doc":
      return (
        <div key={idx} className="space-y-3">
          {children}
        </div>
      );

    case "paragraph":
      if (children.length === 0) return <p key={idx} className="min-h-[1.5em]" />;
      return (
        <p key={idx} className="text-gray-700 leading-relaxed">
          {children}
        </p>
      );

    case "heading": {
      const level = (node.attrs?.level as number) ?? 2;
      const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
      const classes = {
        1: "text-2xl font-bold text-gray-900 mt-6 mb-2",
        2: "text-xl font-bold text-gray-900 mt-5 mb-2",
        3: "text-lg font-semibold text-gray-800 mt-4 mb-1.5",
        4: "text-base font-semibold text-gray-800 mt-3 mb-1",
      };
      return (
        <Tag key={idx} className={classes[level as 1 | 2 | 3 | 4] ?? classes[2]}>
          {children}
        </Tag>
      );
    }

    case "bulletList":
      return (
        <ul key={idx} className="list-disc list-inside space-y-1 text-gray-700 pl-2">
          {children}
        </ul>
      );

    case "orderedList":
      return (
        <ol key={idx} className="list-decimal list-inside space-y-1 text-gray-700 pl-2">
          {children}
        </ol>
      );

    case "listItem":
      return <li key={idx}>{children}</li>;

    case "taskList":
      return (
        <ul key={idx} className="space-y-1.5">
          {children}
        </ul>
      );

    case "taskItem": {
      const checked = node.attrs?.checked === true;
      return (
        <li key={idx} className="flex items-start gap-2">
          <span
            className={cn(
              "mt-0.5 flex-shrink-0 h-4 w-4 rounded border flex items-center justify-center",
              checked
                ? "bg-blue-500 border-blue-500"
                : "border-gray-300 bg-white"
            )}
          >
            {checked && (
              <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                <path
                  d="M2 6l3 3 5-5"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span
            className={cn(
              "text-gray-700",
              checked && "line-through text-gray-400"
            )}
          >
            {children}
          </span>
        </li>
      );
    }

    case "blockquote":
      return (
        <blockquote
          key={idx}
          className="border-l-4 border-blue-300 pl-4 italic text-gray-600 my-3"
        >
          {children}
        </blockquote>
      );

    case "codeBlock":
      return (
        <pre
          key={idx}
          className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm font-mono my-3"
        >
          <code>{children}</code>
        </pre>
      );

    case "horizontalRule":
      return <hr key={idx} className="border-gray-200 my-4" />;

    case "image": {
      const src = node.attrs?.src as string;
      const alt = (node.attrs?.alt as string) ?? "";
      const title = node.attrs?.title as string | undefined;
      if (!src) return null;
      return (
        <figure key={idx} className="my-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            title={title}
            className="rounded-lg max-w-full border border-gray-200"
          />
          {alt && (
            <figcaption className="text-xs text-gray-400 text-center mt-1">
              {alt}
            </figcaption>
          )}
        </figure>
      );
    }

    case "youtube": {
      const src = node.attrs?.src as string;
      if (!src) return null;
      // Convert youtube watch URL to embed URL
      const embedUrl = src
        .replace("watch?v=", "embed/")
        .replace("youtu.be/", "www.youtube.com/embed/");
      return (
        <div key={idx} className="my-4 relative aspect-video rounded-lg overflow-hidden bg-black">
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube video"
          />
        </div>
      );
    }

    case "text":
      return <React.Fragment key={idx}>{renderMarks(node)}</React.Fragment>;

    default:
      // Unknown node — render children if any
      if (children.length > 0)
        return <div key={idx}>{children}</div>;
      if (node.text) return <React.Fragment key={idx}>{node.text}</React.Fragment>;
      return null;
  }
}

export function ContentRenderer({ content }: { content: object | null }) {
  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen className="h-10 w-10 text-gray-200 mb-3" />
        <p className="text-sm text-gray-400">No content for this step yet.</p>
      </div>
    );
  }

  try {
    const doc = content as TiptapNode;
    const nodes = doc.content ?? [];
    if (nodes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-10 w-10 text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">No content for this step yet.</p>
        </div>
      );
    }
    return (
      <div className="prose prose-sm max-w-none">
        {nodes.map((node, i) => renderNode(node, i))}
      </div>
    );
  } catch {
    return (
      <p className="text-sm text-gray-400 italic">
        Unable to render content.
      </p>
    );
  }
}

// ─── Mark Complete Button ─────────────────────────────────────────────────────

export function MarkCompleteButton({
  stepId,
  completed,
}: {
  stepId: string;
  completed: boolean;
}) {
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleComplete = async () => {
    if (completed || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/progress/${stepId}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to mark complete");
      toast("Step marked as complete!", "success");
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
        <CheckCircle2 className="h-5 w-5" />
        Completed
      </div>
    );
  }

  return (
    <Button
      onClick={handleComplete}
      loading={loading}
      variant="success"
      size="md"
      className="gap-1.5"
    >
      <CheckCircle2 className="h-4 w-4" />
      Mark as Complete
    </Button>
  );
}

// ─── Sign-Off Panel ───────────────────────────────────────────────────────────

export function SignOffPanel({
  subjectId,
  subjectTitle,
  existingSignOff,
  defaultName,
}: {
  subjectId: string;
  subjectTitle: string;
  existingSignOff: { signedName: string; signedAt: string } | null;
  defaultName: string;
}) {
  const [signedName, setSignedName] = React.useState(defaultName);
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(!!existingSignOff);
  const { toast } = useToast();

  if (done || existingSignOff) {
    const name = existingSignOff?.signedName ?? signedName;
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="font-semibold text-emerald-800 text-sm">
            Sign-Off Complete
          </span>
        </div>
        <p className="text-sm text-emerald-700">
          Signed as <span className="font-medium">{name}</span>
          {existingSignOff?.signedAt && (
            <>
              {" "}
              on{" "}
              {new Date(existingSignOff.signedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </>
          )}
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acknowledged || !signedName.trim()) {
      toast("Please acknowledge and enter your name.", "warning");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/sign-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, signedName: signedName.trim() }),
      });
      if (!res.ok) throw new Error();
      toast("Sign-off recorded successfully!", "success");
      setDone(true);
    } catch {
      toast("Failed to submit sign-off. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
      <div className="flex items-center gap-2 mb-3">
        <PenLine className="h-5 w-5 text-blue-600" />
        <span className="font-semibold text-blue-900 text-sm">
          Sign-Off Required
        </span>
      </div>
      <p className="text-sm text-blue-700 mb-4">
        You&apos;ve completed all content in{" "}
        <span className="font-medium">{subjectTitle}</span>. Please sign off to
        confirm you have read and understood all material.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm text-blue-800">
            I acknowledge that I have read and understood all content in this
            subject.
          </span>
        </label>

        <div>
          <label className="block text-xs font-medium text-blue-800 mb-1">
            Type your full name to sign
          </label>
          <input
            type="text"
            value={signedName}
            onChange={(e) => setSignedName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <Button
          type="submit"
          loading={loading}
          disabled={!acknowledged || !signedName.trim()}
          variant="default"
          size="md"
          className="w-full"
        >
          Submit Sign-Off
        </Button>
      </form>
    </div>
  );
}

// ─── Step Sidebar ─────────────────────────────────────────────────────────────

function SidebarContent({
  topics,
  activeStepId,
  subjectId,
  onNavigate,
}: {
  topics: TopicMeta[];
  activeStepId: string | null;
  subjectId: string;
  onNavigate?: () => void;
}) {
  const [expandedTopics, setExpandedTopics] = React.useState<Set<string>>(() => {
    // Expand the topic containing the active step by default
    const set = new Set<string>();
    for (const t of topics) {
      if (t.steps.some((s) => s.id === activeStepId)) {
        set.add(t.id);
      }
    }
    // Also expand all topics by default
    for (const t of topics) set.add(t.id);
    return set;
  });

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  return (
    <nav className="py-4">
      {topics.map((topic, topicIdx) => {
        const isExpanded = expandedTopics.has(topic.id);
        const completedInTopic = topic.steps.filter((s) => s.completed).length;

        return (
          <div key={topic.id} className="mb-1">
            {/* Topic header */}
            <button
              onClick={() => toggleTopic(topic.id)}
              className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-medium">
                  {topicIdx + 1}
                </span>
                <span className="text-sm font-medium text-gray-800 truncate">
                  {topic.title}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                {topic.allStepsComplete && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
                <span className="text-xs text-gray-400">
                  {completedInTopic}/{topic.steps.length}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-gray-400 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </div>
            </button>

            {/* Steps */}
            {isExpanded && (
              <div className="pl-4">
                {topic.steps.map((step) => {
                  const isActive = step.id === activeStepId;
                  return (
                    <Link
                      key={step.id}
                      href={`/trainee/subjects/${subjectId}?step=${step.id}`}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <div
                          className={cn(
                            "h-4 w-4 rounded-full border-2 flex-shrink-0",
                            isActive ? "border-blue-500" : "border-gray-300"
                          )}
                        />
                      )}
                      <span className="truncate">{step.title}</span>
                    </Link>
                  );
                })}

                {/* Quiz link */}
                {topic.quiz && topic.allStepsComplete && (
                  <Link
                    href={`/trainee/subjects/${subjectId}/quiz/${topic.quiz.id}`}
                    onClick={onNavigate}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    {topic.quiz.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <HelpCircle className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="font-medium">
                      {topic.quiz.passed ? "Quiz (Passed)" : "Take Quiz"}
                    </span>
                  </Link>
                )}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ─── Main Subject Viewer ──────────────────────────────────────────────────────

export function SubjectViewerClient({
  subjectId,
  subjectTitle,
  topics,
  activeStepId,
  activeStepContent,
  activeStepTitle,
  allStepsComplete,
  requiresSignOff,
  existingSignOff,
  userId: _userId,
  userName,
}: SubjectViewerClientProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Build a flat ordered list of all steps for prev/next nav
  const allSteps = topics.flatMap((t) => t.steps);
  const currentIdx = activeStepId ? allSteps.findIndex((s) => s.id === activeStepId) : -1;
  const prevStep = currentIdx > 0 ? allSteps[currentIdx - 1] : null;
  const nextStep =
    currentIdx >= 0 && currentIdx < allSteps.length - 1
      ? allSteps[currentIdx + 1]
      : null;

  const activeStep = activeStepId ? allSteps.find((s) => s.id === activeStepId) : null;
  const isCompleted = activeStep?.completed ?? false;

  // Find active topic for quiz prompt
  const activeTopic = activeStepId
    ? topics.find((t) => t.steps.some((s) => s.id === activeStepId)) ?? null
    : null;

  // Show quiz prompt when all steps in this topic are done
  const showTopicQuiz =
    activeTopic?.quiz &&
    activeTopic.allStepsComplete &&
    !activeTopic.quiz.passed &&
    activeTopic.quiz.attemptCount < activeTopic.quiz.maxAttempts;

  const showSignOff =
    requiresSignOff && allStepsComplete && !existingSignOff;

  return (
    <div className="flex min-h-[calc(100vh-57px)]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left sidebar */}
      <aside
        className={cn(
          "fixed top-[57px] left-0 bottom-0 z-40 w-72 bg-white border-r border-gray-200 overflow-y-auto transition-transform lg:sticky lg:top-0 lg:translate-x-0 lg:h-[calc(100vh-57px)]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:block lg:flex-shrink-0"
        )}
      >
        {/* Mobile close */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 lg:hidden">
          <span className="text-sm font-semibold text-gray-900">Contents</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <SidebarContent
          topics={topics}
          activeStepId={activeStepId}
          subjectId={subjectId}
          onNavigate={() => setSidebarOpen(false)}
        />
      </aside>

      {/* Content area */}
      <div className="flex-1 min-w-0">
        {/* Mobile open sidebar button */}
        <div className="lg:hidden sticky top-[57px] z-10 bg-white border-b border-gray-100 px-4 py-2.5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <Menu className="h-4 w-4" />
            <span>Contents</span>
          </button>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          {activeStep ? (
            <>
              {/* Step title */}
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {activeStepTitle}
              </h2>
              {activeTopic && (
                <p className="text-xs text-gray-400 mb-6">
                  {activeTopic.title}
                </p>
              )}

              {/* Content */}
              <div className="mb-8">
                <ContentRenderer content={activeStepContent} />
              </div>

              {/* Mark complete */}
              <div className="flex items-center justify-between py-4 border-t border-gray-100 mb-6">
                <MarkCompleteButton stepId={activeStep.id} completed={isCompleted} />
              </div>

              {/* Topic quiz prompt */}
              {showTopicQuiz && activeTopic?.quiz && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-900 text-sm">
                      Quiz Available
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 mb-3">
                    You&apos;ve completed all steps in{" "}
                    <span className="font-medium">{activeTopic.title}</span>.
                    Take the quiz to test your understanding.
                  </p>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/trainee/subjects/${subjectId}/quiz/${activeTopic.quiz.id}`}
                    >
                      <Button variant="default" size="sm">
                        Take Quiz →
                      </Button>
                    </Link>
                    <span className="text-xs text-blue-600">
                      Passing: {activeTopic.quiz.passingScore}% &middot;{" "}
                      {activeTopic.quiz.maxAttempts - activeTopic.quiz.attemptCount} attempt
                      {activeTopic.quiz.maxAttempts - activeTopic.quiz.attemptCount !== 1
                        ? "s"
                        : ""}{" "}
                      remaining
                    </span>
                  </div>
                </div>
              )}

              {/* Passed quiz badge */}
              {activeTopic?.quiz?.passed && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-6 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <span className="text-sm font-medium text-emerald-800">
                      Quiz Passed
                    </span>
                    {activeTopic.quiz.lastScore !== null && (
                      <span className="text-sm text-emerald-600 ml-2">
                        Score: {activeTopic.quiz.lastScore}%
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Sign-off panel */}
              {(showSignOff || existingSignOff) && (
                <div className="mb-6">
                  <SignOffPanel
                    subjectId={subjectId}
                    subjectTitle={subjectTitle}
                    existingSignOff={existingSignOff}
                    defaultName={userName}
                  />
                </div>
              )}

              {/* Step navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                {prevStep ? (
                  <Link
                    href={`/trainee/subjects/${subjectId}?step=${prevStep.id}`}
                  >
                    <Button variant="outline" size="sm" className="gap-1">
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                  </Link>
                ) : (
                  <div />
                )}

                {nextStep ? (
                  <Link
                    href={`/trainee/subjects/${subjectId}?step=${nextStep.id}`}
                  >
                    <Button variant="default" size="sm" className="gap-1">
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <div />
                )}
              </div>
            </>
          ) : (
            // No steps
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-5xl mb-4">📖</div>
              <p className="text-base font-semibold text-gray-700 mb-1">
                No content yet
              </p>
              <p className="text-sm text-gray-400">
                This subject doesn&apos;t have any steps yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
