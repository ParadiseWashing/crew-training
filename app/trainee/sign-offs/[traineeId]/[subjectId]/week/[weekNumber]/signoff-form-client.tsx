"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";

type Rating = "PASS" | "NEEDS_WORK";
type Decision = "PASSED" | "FAILED";

interface TopicItem {
  id: string;
  title: string;
  dayNumber: number | null;
}

interface ExistingSignOff {
  decision: Decision;
  topicRatings: Record<string, Rating>;
  notes: string;
  trainerSignedName: string;
  signedAt: string;
}

export function SignOffForm({
  subjectId,
  weekNumber,
  traineeId,
  traineeName,
  topics,
  existing,
  defaultTrainerName,
}: {
  subjectId: string;
  weekNumber: number;
  traineeId: string;
  traineeName: string;
  topics: TopicItem[];
  existing: ExistingSignOff | null;
  defaultTrainerName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);

  // Group topics by dayNumber for rendering
  const days = React.useMemo(() => {
    const m = new Map<number | null, TopicItem[]>();
    for (const t of topics) {
      const k = t.dayNumber;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    return [...m.entries()].sort(
      ([a], [b]) => (a ?? 999) - (b ?? 999)
    );
  }, [topics]);

  // State: ratings keyed by topicId
  const [ratings, setRatings] = React.useState<Record<string, Rating>>(() => {
    const base: Record<string, Rating> = {};
    for (const t of topics) {
      base[t.id] = existing?.topicRatings?.[t.id] ?? "PASS";
    }
    return base;
  });

  const [decision, setDecision] = React.useState<Decision>(
    existing?.decision ?? "PASSED"
  );
  const [notes, setNotes] = React.useState(existing?.notes ?? "");
  const [trainerSignedName, setTrainerSignedName] = React.useState(
    existing?.trainerSignedName ?? defaultTrainerName
  );

  function setRating(topicId: string, r: Rating) {
    setRatings((prev) => ({ ...prev, [topicId]: r }));
  }

  // Auto-suggest decision: any NEEDS_WORK -> FAILED, all PASS -> PASSED
  // (Trainer can override.)
  const allPass = Object.values(ratings).every((r) => r === "PASS");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trainerSignedName.trim()) {
      toast("Please type your name to sign", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/weekly-signoffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          weekNumber,
          traineeUserId: traineeId,
          decision,
          topicRatings: ratings,
          notes: notes.trim() || null,
          trainerSignedName: trainerSignedName.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save sign-off");
      }
      toast(
        existing ? "Sign-off updated" : "Sign-off recorded",
        "success"
      );
      router.push("/trainee/sign-offs");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {existing && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Sign-off already exists</p>
          <p className="text-xs mt-0.5">
            Last signed by <strong>{existing.trainerSignedName}</strong> on{" "}
            {new Date(existing.signedAt).toLocaleString()}. Submitting will overwrite.
          </p>
        </div>
      )}

      {/* Per-topic ratings */}
      <Card>
        <CardContent className="p-4 sm:p-5 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Topic Evaluation
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Mark each topic as Pass or Needs Work for {traineeName}.
            </p>
          </div>

          {days.map(([day, topicsForDay]) => (
            <div key={day ?? "none"} className="space-y-2">
              {day != null && (
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-1">
                  Day {day}
                </h3>
              )}
              <div className="space-y-2">
                {topicsForDay.map((topic) => {
                  const r = ratings[topic.id];
                  return (
                    <div
                      key={topic.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2.5"
                    >
                      <span className="text-sm text-gray-900 flex-1 min-w-0 truncate">
                        {topic.title}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setRating(topic.id, "PASS")}
                          className={cn(
                            "px-3 py-1 rounded-md text-xs font-semibold border transition-colors",
                            r === "PASS"
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-white text-gray-600 border-gray-300 hover:border-green-300"
                          )}
                        >
                          Pass
                        </button>
                        <button
                          type="button"
                          onClick={() => setRating(topic.id, "NEEDS_WORK")}
                          className={cn(
                            "px-3 py-1 rounded-md text-xs font-semibold border transition-colors",
                            r === "NEEDS_WORK"
                              ? "bg-red-600 text-white border-red-600"
                              : "bg-white text-gray-600 border-gray-300 hover:border-red-300"
                          )}
                        >
                          Needs Work
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Overall decision */}
      <Card>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Overall Decision
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {allPass
                ? "All topics passed — recommend Pass."
                : "Some topics need work — consider Fail."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDecision("PASSED")}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 p-4 transition-colors",
                decision === "PASSED"
                  ? "border-green-600 bg-green-50 text-green-900"
                  : "border-gray-200 hover:border-green-300 text-gray-600"
              )}
            >
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-semibold">Pass</span>
              <span className="text-[10px] uppercase tracking-wide opacity-70">
                Move to next week
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDecision("FAILED")}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 p-4 transition-colors",
                decision === "FAILED"
                  ? "border-red-600 bg-red-50 text-red-900"
                  : "border-gray-200 hover:border-red-300 text-gray-600"
              )}
            >
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-semibold">Fail</span>
              <span className="text-[10px] uppercase tracking-wide opacity-70">
                Needs retraining
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <Textarea
            label="Notes (optional)"
            placeholder="Areas for improvement, specifics on retraining needed, observations..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Signature */}
      <Card>
        <CardContent className="p-4 sm:p-5 space-y-3">
          <Input
            label="Trainer Signature"
            placeholder="Type your full name"
            value={trainerSignedName}
            onChange={(e) => setTrainerSignedName(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500">
            By typing your name and submitting, you certify that you have evaluated{" "}
            <strong>{traineeName}</strong> on Week {weekNumber} and stand behind this
            decision.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Link href="/trainee/sign-offs">
          <Button type="button" variant="outline">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <Button
          type="submit"
          loading={saving}
          disabled={!trainerSignedName.trim()}
        >
          {existing ? "Update Sign-Off" : "Submit Sign-Off"}
        </Button>
      </div>
    </form>
  );
}
