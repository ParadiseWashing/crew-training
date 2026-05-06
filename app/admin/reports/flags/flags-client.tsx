"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Clock,
  Zap,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type FlagType = "SPEED_READ" | "QUIZ_PATTERN" | "QUIZ_SPEED" | "RAPID_MODULE";

interface AuditFlag {
  id: string;
  flagType: FlagType;
  subjectId: string | null;
  topicId: string | null;
  stepId: string | null;
  quizId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

const FLAG_CONFIG: Record<
  FlagType,
  { label: string; description: string; icon: React.ReactNode; color: string }
> = {
  SPEED_READ: {
    label: "Speed Read",
    description: "Completed a reading step too quickly",
    icon: <Clock className="h-4 w-4" />,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  QUIZ_SPEED: {
    label: "Quiz Speed",
    description: "Submitted quiz in under 30 seconds",
    icon: <Zap className="h-4 w-4" />,
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  QUIZ_PATTERN: {
    label: "Quiz Pattern",
    description: "Failed first attempts, passed on final attempt (memorization pattern)",
    icon: <TrendingUp className="h-4 w-4" />,
    color: "text-red-600 bg-red-50 border-red-200",
  },
  RAPID_MODULE: {
    label: "Module Reset",
    description: "Failed all quiz attempts — module was reset",
    icon: <RefreshCw className="h-4 w-4" />,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
};

function FlagDetails({ details, flagType }: { details: Record<string, unknown> | null; flagType: FlagType }) {
  if (!details) return null;

  if (flagType === "SPEED_READ") {
    const expected = details.expectedSeconds as number;
    const actual = details.actualSeconds as number;
    const stepTitle = details.stepTitle as string;
    return (
      <div className="text-xs text-gray-600 space-y-0.5 mt-2">
        {stepTitle && <p>Step: <span className="font-medium">{stepTitle}</span></p>}
        <p>Expected reading time: <span className="font-medium">{Math.ceil(expected)}s</span></p>
        <p>Actual time on page: <span className="font-medium text-amber-700">{actual}s</span></p>
        <p>Completed at: <span className="font-medium text-amber-700">{Math.round((actual / expected) * 100)}%</span> of expected time</p>
        {details.scrolledToBottom === false && (
          <p className="text-red-600">Did not scroll to bottom</p>
        )}
      </div>
    );
  }

  if (flagType === "QUIZ_SPEED") {
    return (
      <div className="text-xs text-gray-600 space-y-0.5 mt-2">
        <p>Time taken: <span className="font-medium text-orange-700">{details.timeTakenSeconds as number}s</span></p>
        <p>Score: <span className="font-medium">{details.score as number}%</span></p>
        <p>Questions: <span className="font-medium">{details.questionCount as number}</span></p>
        <p>Attempt #: <span className="font-medium">{details.attemptNum as number}</span></p>
      </div>
    );
  }

  if (flagType === "QUIZ_PATTERN") {
    const scores = details.attemptScores as number[];
    return (
      <div className="text-xs text-gray-600 space-y-0.5 mt-2">
        <p>Attempt scores: {scores?.map((s, i) => (
          <span key={i} className={cn("font-medium ml-1", i === scores.length - 1 ? "text-emerald-600" : "text-red-600")}>
            {Math.round(s)}%{i < scores.length - 1 ? "," : " (pass)"}
          </span>
        ))}</p>
      </div>
    );
  }

  if (flagType === "RAPID_MODULE") {
    const subject = details.subjectTitle as string;
    return (
      <div className="text-xs text-gray-600 space-y-0.5 mt-2">
        {subject && <p>Module: <span className="font-medium">{subject}</span></p>}
        <p className="text-purple-700">All quiz attempts used — module was fully reset</p>
      </div>
    );
  }

  return null;
}

function FlagRow({ flag, onDismiss }: { flag: AuditFlag; onDismiss: (id: string) => void }) {
  const [expanded, setExpanded] = React.useState(false);
  const [dismissing, setDismissing] = React.useState(false);
  const config = FLAG_CONFIG[flag.flagType];
  const { toast } = useToast();
  const router = useRouter();

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      const res = await fetch(`/api/audit-flags/${flag.id}/dismiss`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast("Flag dismissed.", "success");
      onDismiss(flag.id);
      router.refresh();
    } catch {
      toast("Failed to dismiss flag.", "error");
    } finally {
      setDismissing(false);
    }
  };

  return (
    <div className={cn("rounded-xl border p-4", config.color)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">{config.label}</span>
              <span className="text-xs text-gray-500">
                {new Date(flag.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">{config.description}</p>
            <p className="text-xs font-medium text-gray-800 mt-1">
              {flag.user.name}{" "}
              <span className="font-normal text-gray-500">({flag.user.email})</span>
            </p>

            {expanded && (
              <FlagDetails details={flag.details} flagType={flag.flagType} />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-gray-400 hover:text-gray-600 p-1"
            title={expanded ? "Collapse" : "Expand details"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            loading={dismissing}
            className="gap-1.5 text-xs"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FlagsClient({ flags: initialFlags }: { flags: AuditFlag[] }) {
  const [flags, setFlags] = React.useState(initialFlags);

  const handleDismiss = (id: string) => {
    setFlags((prev) => prev.filter((f) => f.id !== id));
  };

  // Group by user
  const byUser = React.useMemo(() => {
    const map = new Map<string, { user: AuditFlag["user"]; flags: AuditFlag[] }>();
    for (const flag of flags) {
      if (!map.has(flag.user.id)) {
        map.set(flag.user.id, { user: flag.user, flags: [] });
      }
      map.get(flag.user.id)!.flags.push(flag);
    }
    return [...map.values()];
  }, [flags]);

  if (flags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-gray-200 rounded-xl">
        <AlertTriangle className="h-10 w-10 text-gray-200 mb-3" />
        <p className="text-sm font-medium text-gray-500">No active flags</p>
        <p className="text-xs text-gray-400 mt-1">All clear — no suspicious training activity detected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {byUser.map(({ user, flags: userFlags }) => (
        <div key={user.id}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-900">{user.name}</h3>
            <span className="text-xs text-gray-400">{user.email}</span>
            <Badge variant="warning" className="ml-auto">
              {userFlags.length} flag{userFlags.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="space-y-3">
            {userFlags.map((flag) => (
              <FlagRow key={flag.id} flag={flag} onDismiss={handleDismiss} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
