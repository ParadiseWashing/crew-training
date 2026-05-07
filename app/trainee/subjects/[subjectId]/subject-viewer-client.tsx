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
  Lock,
  Clock,
  ScrollText,
  Play,
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

// ─── Tiptap Types ─────────────────────────────────────────────────────────────

type TiptapNode = {
  type?: string;
  text?: string;
  content?: TiptapNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  attrs?: Record<string, unknown>;
};

// ─── Content Utilities ────────────────────────────────────────────────────────

function countWords(node: TiptapNode): number {
  let count = 0;
  if (node.text) {
    count += node.text.trim().split(/\s+/).filter(Boolean).length;
  }
  if (node.content) {
    for (const child of node.content) {
      count += countWords(child);
    }
  }
  return count;
}

function estimatedReadingSeconds(content: object | null): number {
  if (!content) return 0;
  const words = countWords(content as TiptapNode);
  return Math.max(Math.ceil((words / 200) * 60), 15);
}

function extractYouTubeUrls(node: TiptapNode): string[] {
  const urls: string[] = [];
  if (node.type === "youtube" && typeof node.attrs?.src === "string") {
    urls.push(node.attrs.src as string);
  }
  if (node.content) {
    for (const child of node.content) {
      urls.push(...extractYouTubeUrls(child));
    }
  }
  return urls;
}

function getYouTubeVideoId(url: string): string {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\n?#]+)/);
  return m ? m[1] : "";
}

// ─── YouTube IFrame API ───────────────────────────────────────────────────────

declare global {
  interface Window {
    YT: {
      Player: new (
        id: string,
        config: {
          events?: {
            onStateChange?: (event: { data: number }) => void;
            onReady?: (event: unknown) => void;
            onPlaybackRateChange?: (event: { data: number }) => void;
          };
        }
      ) => {
        destroy: () => void;
        getCurrentTime: () => number;
        seekTo: (seconds: number, allowSeekAhead: boolean) => void;
        setPlaybackRate: (rate: number) => void;
        playVideo: () => void;
      };
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady: (() => void) | undefined;
    _ytReadyCallbacks: Array<() => void>;
  }
}

function loadYouTubeAPI(onReady: () => void) {
  if (typeof window === "undefined") return;
  if (window.YT?.Player) {
    onReady();
    return;
  }
  window._ytReadyCallbacks = window._ytReadyCallbacks ?? [];
  window._ytReadyCallbacks.push(onReady);
  if (!document.getElementById("yt-api-script")) {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      window._ytReadyCallbacks?.forEach((fn) => fn());
      window._ytReadyCallbacks = [];
    };
    const script = document.createElement("script");
    script.id = "yt-api-script";
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  }
}

// ─── Video Tracking Context ───────────────────────────────────────────────────

interface VideoContextValue {
  onVideoComplete: (url: string) => void;
  completedUrls: Set<string>;
}

const VideoContext = React.createContext<VideoContextValue>({
  onVideoComplete: () => {},
  completedUrls: new Set(),
});

// ─── YouTube Player Component ─────────────────────────────────────────────────

function YouTubePlayer({ src, idx }: { src: string; idx: number }) {
  const { onVideoComplete, completedUrls } = React.useContext(VideoContext);
  const videoId = getYouTubeVideoId(src);
  const playerId = `yt-player-${videoId}-${idx}`;
  const playerRef = React.useRef<InstanceType<typeof window.YT.Player> | null>(null);
  const maxWatchedRef = React.useRef(0);
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const isCompleted = completedUrls.has(src);
  const [hasStarted, setHasStarted] = React.useState(false);

  React.useEffect(() => {
    if (!videoId) return;
    let destroyed = false;

    loadYouTubeAPI(() => {
      if (destroyed || playerRef.current) return;
      maxWatchedRef.current = 0;

      playerRef.current = new window.YT.Player(playerId, {
        events: {
          onReady: () => {
            // Poll every 500ms — if current time is more than 1s ahead of max
            // watched, seek back. This prevents skipping forward.
            pollRef.current = setInterval(() => {
              if (!playerRef.current) return;
              const current = playerRef.current.getCurrentTime();
              if (current > maxWatchedRef.current + 1) {
                playerRef.current.seekTo(maxWatchedRef.current, true);
              } else {
                maxWatchedRef.current = Math.max(maxWatchedRef.current, current);
              }
            }, 500);
          },
          onStateChange: (event) => {
            // 0 = ENDED
            if (event.data === 0) {
              onVideoComplete(src);
            }
          },
          onPlaybackRateChange: (event) => {
            // Lock playback speed to 1x
            if (playerRef.current && event.data !== 1) {
              playerRef.current.setPlaybackRate(1);
            }
          },
        },
      });
    });

    return () => {
      destroyed = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, playerId]);

  if (!videoId) return null;

  // controls=0 removes YouTube's native control bar entirely (including the
  // seek bar), so trainees can't click or drag the timeline to skip ahead. A
  // custom overlay handles starting playback; once started, an invisible
  // click-blocker covers the iframe so they can't pause or otherwise interact.
  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&disablekb=1&rel=0&controls=0&modestbranding=1&fs=0`;

  const handleStart = () => {
    if (!playerRef.current) return;
    try {
      playerRef.current.playVideo();
      setHasStarted(true);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="my-4 relative">
      {isCompleted && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full pointer-events-none">
          <CheckCircle2 className="h-3 w-3" />
          Watched
        </div>
      )}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
        <iframe
          id={playerId}
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          title="YouTube video"
        />
        {!hasStarted && (
          <button
            type="button"
            onClick={handleStart}
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors group"
            aria-label="Play video"
          >
            <span className="flex items-center justify-center h-16 w-16 rounded-full bg-white/95 group-hover:bg-white shadow-lg">
              <Play className="h-7 w-7 text-black fill-black ml-1" />
            </span>
          </button>
        )}
      </div>
      {!isCompleted && (
        <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
          <Play className="h-3 w-3" />
          Watch the full video to continue
        </p>
      )}
    </div>
  );
}

// ─── Content Renderer ─────────────────────────────────────────────────────────

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
          className="text-accent underline hover:text-accent-hover"
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
              checked ? "bg-accent border-accent" : "border-gray-300 bg-white"
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
          <span className={cn("text-gray-700", checked && "line-through text-gray-400")}>
            {children}
          </span>
        </li>
      );
    }

    case "blockquote":
      return (
        <blockquote key={idx} className="border-l-4 border-accent-soft pl-4 italic text-gray-600 my-3">
          {children}
        </blockquote>
      );

    case "codeBlock":
      return (
        <pre key={idx} className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm font-mono my-3">
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
          <img src={src} alt={alt} title={title} className="rounded-lg max-w-full border border-gray-200" />
          {alt && <figcaption className="text-xs text-gray-400 text-center mt-1">{alt}</figcaption>}
        </figure>
      );
    }

    case "youtube": {
      const src = node.attrs?.src as string;
      if (!src) return null;
      return <YouTubePlayer key={idx} src={src} idx={idx} />;
    }

    case "text":
      return <React.Fragment key={idx}>{renderMarks(node)}</React.Fragment>;

    default:
      if (children.length > 0) return <div key={idx}>{children}</div>;
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
    return <p className="text-sm text-gray-400 italic">Unable to render content.</p>;
  }
}

// ─── Completion Gate ──────────────────────────────────────────────────────────

function CompletionGate({
  readingDone,
  scrollDone,
  videosRequired,
  videosWatched,
  readingSecondsLeft,
}: {
  readingDone: boolean;
  scrollDone: boolean;
  videosRequired: number;
  videosWatched: number;
  readingSecondsLeft: number;
}) {
  const allDone = readingDone && scrollDone && videosWatched >= videosRequired;
  if (allDone) return null;

  const items: { label: string; done: boolean; icon: React.ReactNode }[] = [];

  if (!scrollDone) {
    items.push({
      label: "Scroll to the bottom",
      done: false,
      icon: <ScrollText className="h-3.5 w-3.5" />,
    });
  }

  if (!readingDone) {
    const mins = Math.floor(readingSecondsLeft / 60);
    const secs = readingSecondsLeft % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    items.push({
      label: `Reading time: ${timeStr} remaining`,
      done: false,
      icon: <Clock className="h-3.5 w-3.5" />,
    });
  }

  if (videosRequired > 0 && videosWatched < videosRequired) {
    items.push({
      label: `Watch video${videosRequired > 1 ? "s" : ""} (${videosWatched}/${videosRequired})`,
      done: false,
      icon: <Play className="h-3.5 w-3.5" />,
    });
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-4">
      <p className="text-xs font-semibold text-amber-800 mb-2 uppercase tracking-wide">
        Complete before continuing
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-amber-700">
            {item.icon}
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Mark Complete Button ─────────────────────────────────────────────────────

export function MarkCompleteButton({
  stepId,
  completed,
  canComplete,
  timeSpentSeconds,
  scrolledToBottom,
}: {
  stepId: string;
  completed: boolean;
  canComplete: boolean;
  timeSpentSeconds: number;
  scrolledToBottom: boolean;
}) {
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleComplete = async () => {
    if (completed || loading || !canComplete) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/progress/${stepId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeSpentSeconds, scrolledToBottom }),
      });
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
      disabled={!canComplete || loading}
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
          <span className="font-semibold text-emerald-800 text-sm">Sign-Off Complete</span>
        </div>
        <p className="text-sm text-emerald-700">
          Signed as <span className="font-medium">{name}</span>
          {existingSignOff?.signedAt && (
            <> on {new Date(existingSignOff.signedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</>
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
    <div className="rounded-xl border border-accent-soft bg-accent-tint p-5">
      <div className="flex items-center gap-2 mb-3">
        <PenLine className="h-5 w-5 text-accent" />
        <span className="font-semibold text-accent-hover text-sm">Sign-Off Required</span>
      </div>
      <p className="text-sm text-accent-hover mb-4">
        You&apos;ve completed all content in{" "}
        <span className="font-medium">{subjectTitle}</span>. Please sign off to confirm you have
        read and understood all material.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
          />
          <span className="text-sm text-accent-hover">
            I acknowledge that I have read and understood all content in this subject.
          </span>
        </label>
        <div>
          <label className="block text-xs font-medium text-accent-hover mb-1">
            Type your full name to sign
          </label>
          <input
            type="text"
            value={signedName}
            onChange={(e) => setSignedName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-lg border border-accent-soft bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
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
  lockedStepIds,
}: {
  topics: TopicMeta[];
  activeStepId: string | null;
  subjectId: string;
  onNavigate?: () => void;
  lockedStepIds: Set<string>;
}) {
  const [expandedTopics, setExpandedTopics] = React.useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const t of topics) {
      if (t.steps.some((s) => s.id === activeStepId)) set.add(t.id);
    }
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
            <button
              onClick={() => toggleTopic(topic.id)}
              className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-medium">
                  {topicIdx + 1}
                </span>
                <span className="text-sm font-medium text-gray-800 truncate">{topic.title}</span>
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

            {isExpanded && (
              <div className="pl-4">
                {topic.steps.map((step) => {
                  const isActive = step.id === activeStepId;
                  const isLocked = lockedStepIds.has(step.id);

                  if (isLocked) {
                    return (
                      <div
                        key={step.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 cursor-not-allowed select-none"
                      >
                        <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{step.title}</span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={step.id}
                      href={`/trainee/subjects/${subjectId}?step=${step.id}`}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-accent-tint text-accent-hover font-medium"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <div
                          className={cn(
                            "h-4 w-4 rounded-full border-2 flex-shrink-0",
                            isActive ? "border-accent" : "border-gray-300"
                          )}
                        />
                      )}
                      <span className="truncate">{step.title}</span>
                    </Link>
                  );
                })}

                {/* Quiz link — only when all steps in topic done */}
                {topic.quiz && topic.allStepsComplete && (
                  <Link
                    href={`/trainee/subjects/${subjectId}/quiz/${topic.quiz.id}`}
                    onClick={onNavigate}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-accent hover:bg-accent-tint transition-colors"
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

                {/* Locked quiz indicator */}
                {topic.quiz && !topic.allStepsComplete && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 cursor-not-allowed select-none">
                    <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Quiz (complete steps first)</span>
                  </div>
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

  // ── Sequential locking ──────────────────────────────────────────────────
  const allStepsOrdered = topics
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((t) =>
      t.steps.slice().sort((a, b) => a.orderIndex - b.orderIndex)
    );

  const lockedStepIds = React.useMemo(() => {
    const locked = new Set<string>();
    let anyPreviousIncomplete = false;
    for (const step of allStepsOrdered) {
      if (anyPreviousIncomplete) locked.add(step.id);
      if (!step.completed) anyPreviousIncomplete = true;
    }
    return locked;
  }, [allStepsOrdered]);

  // Prev/next nav (skip locked for next)
  const currentIdx = activeStepId
    ? allStepsOrdered.findIndex((s) => s.id === activeStepId)
    : -1;
  const prevStep = currentIdx > 0 ? allStepsOrdered[currentIdx - 1] : null;
  const nextStep =
    currentIdx >= 0 && currentIdx < allStepsOrdered.length - 1
      ? allStepsOrdered[currentIdx + 1]
      : null;

  const activeStep = activeStepId
    ? allStepsOrdered.find((s) => s.id === activeStepId)
    : null;
  const isCompleted = activeStep?.completed ?? false;
  const isLocked = activeStepId ? lockedStepIds.has(activeStepId) : false;

  // ── Reading timer ───────────────────────────────────────────────────────
  const readingTime = estimatedReadingSeconds(activeStepContent);
  const [timeOnPage, setTimeOnPage] = React.useState(0);

  React.useEffect(() => {
    setTimeOnPage(0);
    if (isCompleted || !activeStepId) return;
    const interval = setInterval(() => setTimeOnPage((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [activeStepId, isCompleted]);

  const readingDone = isCompleted || timeOnPage >= readingTime;
  const readingSecondsLeft = Math.max(0, readingTime - timeOnPage);

  // ── Scroll tracking ─────────────────────────────────────────────────────
  const contentEndRef = React.useRef<HTMLDivElement>(null);
  const [scrolledToBottom, setScrolledToBottom] = React.useState(false);

  React.useEffect(() => {
    setScrolledToBottom(false);
    if (isCompleted || !activeStepId) return;

    const el = contentEndRef.current;
    if (!el) return;

    const check = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        setScrolledToBottom(true);
        window.removeEventListener("scroll", check);
      }
    };

    check(); // Fire immediately if sentinel already in viewport
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [activeStepId, isCompleted]);

  // ── YouTube video tracking ──────────────────────────────────────────────
  const videoUrls = React.useMemo(
    () => extractYouTubeUrls((activeStepContent ?? {}) as TiptapNode),
    [activeStepContent]
  );
  const [completedUrls, setCompletedUrls] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    setCompletedUrls(new Set());
  }, [activeStepId]);

  const handleVideoComplete = React.useCallback((url: string) => {
    setCompletedUrls((prev) => new Set([...prev, url]));
  }, []);

  const videoContext = React.useMemo(
    () => ({ onVideoComplete: handleVideoComplete, completedUrls }),
    [handleVideoComplete, completedUrls]
  );

  // ── Completion gate ─────────────────────────────────────────────────────
  const allVideosDone = completedUrls.size >= videoUrls.length;
  const canComplete = readingDone && scrolledToBottom && allVideosDone;

  // Active topic
  const activeTopic = activeStepId
    ? topics.find((t) => t.steps.some((s) => s.id === activeStepId)) ?? null
    : null;

  const showTopicQuiz =
    activeTopic?.quiz &&
    activeTopic.allStepsComplete &&
    !activeTopic.quiz.passed &&
    activeTopic.quiz.attemptCount < activeTopic.quiz.maxAttempts;

  const showSignOff = requiresSignOff && allStepsComplete && !existingSignOff;

  // Next button: disabled if current step not complete OR next step is locked
  const nextIsLocked = nextStep ? lockedStepIds.has(nextStep.id) : false;
  const canGoNext = isCompleted && !nextIsLocked;

  return (
    <VideoContext.Provider value={videoContext}>
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
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 lg:hidden">
            <span className="text-sm font-semibold text-gray-900">Contents</span>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <SidebarContent
            topics={topics}
            activeStepId={activeStepId}
            subjectId={subjectId}
            onNavigate={() => setSidebarOpen(false)}
            lockedStepIds={lockedStepIds}
          />
        </aside>

        {/* Content area */}
        <div className="flex-1 min-w-0">
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
            {isLocked ? (
              // Locked step — show message
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Lock className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-base font-semibold text-gray-700 mb-1">Step Locked</p>
                <p className="text-sm text-gray-400">
                  Complete the previous step first to unlock this one.
                </p>
              </div>
            ) : activeStep ? (
              <>
                {/* Step title */}
                <h2 className="text-xl font-bold text-gray-900 mb-1">{activeStepTitle}</h2>
                {activeTopic && (
                  <p className="text-xs text-gray-400 mb-6">{activeTopic.title}</p>
                )}

                {/* Content */}
                <div className="mb-8">
                  <ContentRenderer content={activeStepContent} />
                </div>

                {/* Scroll sentinel */}
                <div ref={contentEndRef} className="h-1" />

                {/* Completion gate */}
                {!isCompleted && (
                  <CompletionGate
                    readingDone={readingDone}
                    scrollDone={scrolledToBottom}
                    videosRequired={videoUrls.length}
                    videosWatched={completedUrls.size}
                    readingSecondsLeft={readingSecondsLeft}
                  />
                )}

                {/* Mark complete */}
                <div className="flex items-center justify-between py-4 border-t border-gray-100 mb-6">
                  <MarkCompleteButton
                    stepId={activeStep.id}
                    completed={isCompleted}
                    canComplete={canComplete}
                    timeSpentSeconds={timeOnPage}
                    scrolledToBottom={scrolledToBottom}
                  />
                </div>

                {/* Topic quiz prompt */}
                {showTopicQuiz && activeTopic?.quiz && (
                  <div className="rounded-xl border border-accent-soft bg-accent-tint p-5 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <HelpCircle className="h-5 w-5 text-accent" />
                      <span className="font-semibold text-accent-hover text-sm">Quiz Available</span>
                    </div>
                    <p className="text-sm text-accent-hover mb-3">
                      You&apos;ve completed all steps in{" "}
                      <span className="font-medium">{activeTopic.title}</span>. Take the quiz to
                      test your understanding.
                    </p>
                    <div className="flex items-center gap-3">
                      <Link href={`/trainee/subjects/${subjectId}/quiz/${activeTopic.quiz.id}`}>
                        <Button variant="default" size="sm">
                          Take Quiz →
                        </Button>
                      </Link>
                      <span className="text-xs text-accent">
                        Must score 100% &middot;{" "}
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
                      <span className="text-sm font-medium text-emerald-800">Quiz Passed</span>
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
                  {prevStep && !lockedStepIds.has(prevStep.id) ? (
                    <Link href={`/trainee/subjects/${subjectId}?step=${prevStep.id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                    </Link>
                  ) : (
                    <div />
                  )}

                  {nextStep ? (
                    canGoNext ? (
                      <Link href={`/trainee/subjects/${subjectId}?step=${nextStep.id}`}>
                        <Button variant="default" size="sm" className="gap-1">
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="default" size="sm" className="gap-1" disabled>
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )
                  ) : (
                    <div />
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-5xl mb-4">📖</div>
                <p className="text-base font-semibold text-gray-700 mb-1">No content yet</p>
                <p className="text-sm text-gray-400">
                  This subject doesn&apos;t have any steps yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </VideoContext.Provider>
  );
}
