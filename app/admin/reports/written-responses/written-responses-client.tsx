"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PenLine, Check, X, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

interface Grade {
  verdict: "CORRECT" | "INCORRECT";
  feedback?: string;
}

export interface AttemptRow {
  id: string;
  score: number;
  passed: boolean;
  attemptNum: number;
  takenAt: string;
  gradedAt: string | null;
  gradedByName: string | null;
  passingScore: number;
  user: { id: string; name: string; email: string };
  subjectTitle: string;
  topicTitle: string;
  questions: { id: string; text: string; answer: string; grade: Grade | null }[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function AttemptCard({ row, startExpanded }: { row: AttemptRow; startExpanded: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [expanded, setExpanded] = React.useState(startExpanded);
  const [saving, setSaving] = React.useState(false);
  const [draft, setDraft] = React.useState<Record<string, Grade | null>>(() =>
    Object.fromEntries(row.questions.map((q) => [q.id, q.grade]))
  );

  const ungraded = row.questions.filter((q) => !q.grade).length;
  const dirty = row.questions.some(
    (q) =>
      (draft[q.id]?.verdict ?? null) !== (q.grade?.verdict ?? null) ||
      (draft[q.id]?.feedback ?? "") !== (q.grade?.feedback ?? "")
  );
  const canSave = dirty && row.questions.every((q) => draft[q.id]?.verdict);

  function setVerdict(questionId: string, verdict: Grade["verdict"]) {
    setDraft((prev) => ({
      ...prev,
      [questionId]: { verdict, feedback: prev[questionId]?.feedback },
    }));
  }

  function setFeedback(questionId: string, feedback: string) {
    setDraft((prev) => ({
      ...prev,
      [questionId]: { verdict: prev[questionId]?.verdict ?? "CORRECT", feedback },
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const grades: Record<string, Grade> = {};
      for (const q of row.questions) {
        const g = draft[q.id];
        if (g?.verdict) {
          grades[q.id] = g.feedback?.trim()
            ? { verdict: g.verdict, feedback: g.feedback.trim() }
            : { verdict: g.verdict };
        }
      }
      const res = await fetch(`/api/quiz-attempts/${row.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grades }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast(
        `Graded — score is now ${Math.round(data.score)}% (${data.passed ? "passed" : "failed"}).`,
        data.passed ? "success" : "error"
      );
      router.refresh();
    } catch {
      toast("Could not save these grades.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-white",
        ungraded > 0 ? "border-[#F0C48A]" : "border-[#E8E4DE]"
      )}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#0E0E0E]">{row.user.name}</span>
            <span className="text-xs text-[#6E665D]">{row.user.email}</span>
            {ungraded > 0 ? (
              <Badge variant="warning">
                {ungraded} awaiting review
              </Badge>
            ) : (
              <Badge variant="success">Graded</Badge>
            )}
          </div>
          <p className="text-xs text-[#6E665D] mt-1">
            {row.subjectTitle} · {row.topicTitle} · Attempt {row.attemptNum} ·{" "}
            {formatDate(row.takenAt)}
          </p>
          <p className="text-xs mt-1">
            <span className="text-[#6E665D]">Score </span>
            <span
              className={cn(
                "font-semibold",
                row.passed ? "text-[#3F8556]" : "text-[#C53438]"
              )}
            >
              {Math.round(row.score)}% {row.passed ? "(passed)" : "(failed)"}
            </span>
            <span className="text-[#BDB6AD]"> · needs {row.passingScore}%</span>
            {row.gradedAt && (
              <span className="text-[#6E665D]">
                {" "}
                · reviewed by {row.gradedByName} on {formatDate(row.gradedAt)}
              </span>
            )}
          </p>
        </div>
        <div className="flex-shrink-0 text-[#BDB6AD] pt-1">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#E8E4DE] p-4 space-y-5">
          {row.questions.map((q) => {
            const verdict = draft[q.id]?.verdict;
            return (
              <div key={q.id} className="space-y-2">
                <p className="text-sm font-medium text-[#0E0E0E]">{q.text}</p>
                <div className="rounded-lg bg-[#F7F5F2] border border-[#E8E4DE] p-3 text-sm text-[#34302C] whitespace-pre-wrap">
                  {q.answer || <span className="italic text-[#BDB6AD]">No answer given</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={verdict === "CORRECT" ? "success" : "outline"}
                    onClick={() => setVerdict(q.id, "CORRECT")}
                    className="gap-1.5 text-xs"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Correct
                  </Button>
                  <Button
                    size="sm"
                    variant={verdict === "INCORRECT" ? "destructive" : "outline"}
                    onClick={() => setVerdict(q.id, "INCORRECT")}
                    className="gap-1.5 text-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                    Incorrect
                  </Button>
                </div>
                <textarea
                  value={draft[q.id]?.feedback ?? ""}
                  onChange={(e) => setFeedback(q.id, e.target.value)}
                  placeholder="Optional feedback for the trainee…"
                  rows={2}
                  className="w-full rounded-lg border border-[#E8E4DE] bg-white px-3 py-2 text-sm text-[#0E0E0E] focus:outline-none focus:ring-2 focus:ring-[#F08A3E] focus:border-[#F08A3E]"
                />
              </div>
            );
          })}

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-xs text-[#6E665D]">
              Saving recalculates this attempt&apos;s score and the trainee&apos;s module status.
            </p>
            <Button size="sm" onClick={save} loading={saving} disabled={!canSave}>
              Save Grades
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function WrittenResponsesClient({ rows }: { rows: AttemptRow[] }) {
  const [tab, setTab] = React.useState<"pending" | "graded">("pending");

  const pending = rows.filter((r) => r.questions.some((q) => !q.grade));
  const graded = rows.filter((r) => r.questions.every((q) => q.grade));
  const visible = tab === "pending" ? pending : graded;

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-[#E8E4DE] rounded-xl">
        <PenLine className="h-10 w-10 text-[#E8E4DE] mb-3" />
        <p className="text-sm font-medium text-[#6E665D]">No written responses yet</p>
        <p className="text-xs text-[#BDB6AD] mt-1">
          Add a written-response question to a quiz and submitted answers will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["pending", "graded"] as const).map((key) => {
          const count = key === "pending" ? pending.length : graded.length;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                tab === key
                  ? "bg-[#FEF5EC] text-[#D9701F]"
                  : "text-[#6E665D] hover:bg-[#F7F5F2]"
              )}
            >
              {key === "pending" ? "Needs Review" : "Graded"} ({count})
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#E8E4DE] rounded-xl">
          <CheckCircle2 className="h-10 w-10 text-[#E8E4DE] mb-3" />
          <p className="text-sm font-medium text-[#6E665D]">
            {tab === "pending" ? "Nothing waiting on review" : "Nothing graded yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((row) => (
            <AttemptCard key={row.id} row={row} startExpanded={tab === "pending"} />
          ))}
        </div>
      )}
    </div>
  );
}
