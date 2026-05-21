"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Lock,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import {
  AUTO_DQ_FLAGS,
  DAY_1_TASKS,
  DAY_2_TASKS,
  OBSERVATIONS,
  RATING_OPTIONS,
  RETENTION_OPTIONS,
  PRODUCTION_SPEED_OPTIONS,
  QUALITY_AT_SPEED_OPTIONS,
  decisionOptionsForDay,
  forcedDecisionForDay,
  type RatingScale,
  type RetentionScale,
} from "@/lib/working-interview";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayReport {
  id: string;
  day: number;
  decision: "CONTINUE" | "DQ" | "HIRE" | "DO_NOT_HIRE";
  ratings: Record<string, unknown>;
  autoDqFlags: string[];
  notes: string | null;
  submittedAt: string;
  evaluator: { id: string; name: string };
}

interface InterviewData {
  id: string;
  candidateName: string;
  status: "IN_PROGRESS" | "PASSED" | "DISQUALIFIED";
  startedAt: string;
  completedAt: string | null;
  startedBy: { id: string; name: string };
  days: DayReport[];
}

const DAY_TITLES: Record<number, string> = {
  1: "Day 1 — Taught",
  2: "Day 2 — Tested",
  3: "Day 3 — Produced",
};

const DAY_SUBTITLES: Record<number, string> = {
  1: "Teach the 3 tasks in order. Candidate executes under direct supervision; you correct in real time.",
  2: "Same tasks. No re-teaching. Test retention, pace, and quality at speed.",
  3: "Real production. Candidate held to near-full crew speed. Owner stops by 30-60 min.",
};

// ─── Workflow Container ───────────────────────────────────────────────────────

export function InterviewWorkflowClient({ interview }: { interview: InterviewData }) {
  const submittedDays = new Set(interview.days.map((d) => d.day));
  const isClosed = interview.status !== "IN_PROGRESS";
  const nextDay = !isClosed ? interview.days.length + 1 : null;

  const [activeDay, setActiveDay] = React.useState<number | null>(nextDay && nextDay <= 3 ? nextDay : null);

  return (
    <div className="space-y-3">
      {[1, 2, 3].map((day) => {
        const submission = interview.days.find((d) => d.day === day);
        const isSubmitted = submittedDays.has(day);
        const isNext = !isClosed && day === nextDay;
        const isLocked = !isSubmitted && !isNext;
        const isOpen = activeDay === day && isNext;

        return (
          <DayCard
            key={day}
            day={day}
            isSubmitted={isSubmitted}
            isLocked={isLocked}
            isNext={isNext}
            isOpen={isOpen}
            submission={submission}
            interviewId={interview.id}
            candidateName={interview.candidateName}
            onToggle={() => setActiveDay(isOpen ? null : day)}
          />
        );
      })}

      {interview.status === "PASSED" && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-900">
              <span className="font-semibold">{interview.candidateName}</span> passed the working
              interview. Tag them <strong>Needs Onboarding</strong> in admin Reports.
            </p>
          </CardContent>
        </Card>
      )}
      {interview.status === "DISQUALIFIED" && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-900">
              <span className="font-semibold">{interview.candidateName}</span> was disqualified.
              Remaining days are locked.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Day Card ─────────────────────────────────────────────────────────────────

function DayCard({
  day,
  isSubmitted,
  isLocked,
  isNext,
  isOpen,
  submission,
  interviewId,
  candidateName,
  onToggle,
}: {
  day: number;
  isSubmitted: boolean;
  isLocked: boolean;
  isNext: boolean;
  isOpen: boolean;
  submission: DayReport | undefined;
  interviewId: string;
  candidateName: string;
  onToggle: () => void;
}) {
  return (
    <Card
      className={cn(
        "transition-all",
        isOpen && "border-accent-soft shadow-sm",
        isLocked && "opacity-60"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={isLocked || isSubmitted}
        className={cn(
          "w-full text-left p-4 flex items-center gap-3",
          (!isLocked && !isSubmitted) && "hover:bg-gray-50 cursor-pointer transition-colors"
        )}
      >
        <div
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0",
            isSubmitted && submission?.decision && ["CONTINUE", "HIRE"].includes(submission.decision)
              ? "bg-emerald-100 text-emerald-700"
              : isSubmitted
                ? "bg-red-100 text-red-700"
                : isNext
                  ? "bg-accent-tint text-accent"
                  : "bg-gray-100 text-gray-400"
          )}
        >
          D{day}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{DAY_TITLES[day]}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {isSubmitted && submission
              ? `Submitted ${new Date(submission.submittedAt).toLocaleDateString()} by ${submission.evaluator.name} — ${decisionLabel(submission.decision)}`
              : isNext
                ? "Tap to fill out today's report"
                : "Locked until previous day is submitted"}
          </p>
        </div>
        {isLocked && <Lock className="h-4 w-4 text-gray-300 flex-shrink-0" />}
        {isSubmitted && <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
        {isNext && !isOpen && <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />}
      </button>

      {isOpen && !isSubmitted && !isLocked && (
        <CardContent className="border-t border-gray-100 pt-5">
          <DayForm
            day={day}
            interviewId={interviewId}
            candidateName={candidateName}
          />
        </CardContent>
      )}

      {isSubmitted && submission && (
        <CardContent className="border-t border-gray-100 pt-4">
          <SubmittedSummary submission={submission} day={day} />
        </CardContent>
      )}
    </Card>
  );
}

function decisionLabel(d: DayReport["decision"]): string {
  return d === "CONTINUE"
    ? "Continue"
    : d === "DQ"
      ? "DQ"
      : d === "HIRE"
        ? "Recommend Hire"
        : "Do Not Hire";
}

// ─── Day Form ─────────────────────────────────────────────────────────────────

function DayForm({
  day,
  interviewId,
  candidateName,
}: {
  day: number;
  interviewId: string;
  candidateName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  // State per field
  const [autoDqFlags, setAutoDqFlags] = React.useState<string[]>([]);
  const [taskRatings, setTaskRatings] = React.useState<Record<string, RatingScale | RetentionScale | "">>({});
  const [observations, setObservations] = React.useState<Record<string, RatingScale | "">>({});
  // Day 3-only
  const [ownerVisitConfirmed, setOwnerVisitConfirmed] = React.useState<boolean | null>(null);
  const [ownerVisitTime, setOwnerVisitTime] = React.useState("");
  const [productionSpeed, setProductionSpeed] = React.useState<string>("");
  const [qualityAtSpeed, setQualityAtSpeed] = React.useState<string>("");
  // Day 2-only
  const [paceAtSpeed, setPaceAtSpeed] = React.useState<RatingScale | "">("");
  // Shared
  const [notes, setNotes] = React.useState("");
  const [decision, setDecision] = React.useState<"CONTINUE" | "DQ" | "HIRE" | "DO_NOT_HIRE" | "">("");

  // If any auto-DQ flag is checked, decision is forced.
  const forcedDecision = autoDqFlags.length > 0 ? forcedDecisionForDay(day) : null;
  const effectiveDecision = forcedDecision ?? decision;

  function toggleFlag(code: string) {
    setAutoDqFlags((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  const tasks = day === 1 ? DAY_1_TASKS : day === 2 ? DAY_2_TASKS : [];
  const taskScale = day === 2 ? RETENTION_OPTIONS : RATING_OPTIONS;
  const taskScaleLabel = day === 2 ? "Re-teach needed?" : "Performance";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveDecision) {
      toast("Please choose a decision", "error");
      return;
    }

    const ratings: Record<string, unknown> = {
      tasks: taskRatings,
      observations,
    };
    if (day === 2) ratings.paceAtSpeed = paceAtSpeed;
    if (day === 3) {
      ratings.ownerVisitConfirmed = ownerVisitConfirmed;
      ratings.ownerVisitTime = ownerVisitTime;
      ratings.productionSpeed = productionSpeed;
      ratings.qualityAtSpeed = qualityAtSpeed;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/working-interviews/${interviewId}/days/${day}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ratings,
          autoDqFlags,
          notes,
          decision: effectiveDecision,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to submit report");
      }
      toast(`Day ${day} report submitted`, "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-xs text-gray-500">
        {DAY_SUBTITLES[day]} <span className="text-gray-400">· Evaluating: {candidateName}</span>
      </p>

      {/* Auto-DQ flags */}
      <FormSection title="Automatic disqualifiers" subtitle="Check any that apply. ANY checked = DQ.">
        <div className="space-y-1.5">
          {AUTO_DQ_FLAGS.map((flag) => {
            const checked = autoDqFlags.includes(flag.code);
            return (
              <label
                key={flag.code}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                  checked
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleFlag(flag.code)}
                  className="h-4 w-4 rounded text-red-600 focus:ring-red-500 border-gray-300"
                />
                <span className={cn("text-sm", checked ? "text-red-900 font-medium" : "text-gray-700")}>
                  {flag.label}
                </span>
              </label>
            );
          })}
        </div>
      </FormSection>

      {/* Day 1 & 2: Task ratings */}
      {tasks.length > 0 && (
        <FormSection title={day === 2 ? "Task retention" : "Task performance"} subtitle={taskScaleLabel}>
          <div className="space-y-3">
            {tasks.map((task) => (
              <RatingRow
                key={task.id}
                label={task.label}
                options={taskScale}
                value={(taskRatings[task.id] as string) || ""}
                onChange={(v) =>
                  setTaskRatings((prev) => ({ ...prev, [task.id]: v as RatingScale | RetentionScale }))
                }
              />
            ))}
          </div>
        </FormSection>
      )}

      {/* Day 2: Pace at speed */}
      {day === 2 && (
        <FormSection title="Pace & quality at speed">
          <RatingRow
            label="How did they hold up at speed?"
            options={RATING_OPTIONS}
            value={paceAtSpeed}
            onChange={(v) => setPaceAtSpeed(v as RatingScale)}
          />
        </FormSection>
      )}

      {/* Day 3: Production-day-specific */}
      {day === 3 && (
        <>
          <FormSection title="Owner site visit" subtitle="Non-negotiable Day 3 check-in.">
            <div className="flex gap-2">
              {[
                { value: true, label: "Confirmed" },
                { value: false, label: "Did not happen" },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setOwnerVisitConfirmed(opt.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                    ownerVisitConfirmed === opt.value
                      ? "border-accent bg-accent-tint text-accent-hover"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {ownerVisitConfirmed === true && (
              <input
                type="text"
                value={ownerVisitTime}
                onChange={(e) => setOwnerVisitTime(e.target.value)}
                placeholder="What time? (e.g. 10:30am)"
                className="mt-2 w-full max-w-xs rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            )}
          </FormSection>

          <FormSection title="Production speed">
            <RatingRow
              label="How fast were they relative to a normal crew member?"
              options={PRODUCTION_SPEED_OPTIONS}
              value={productionSpeed}
              onChange={setProductionSpeed}
            />
          </FormSection>

          <FormSection title="Quality at speed">
            <RatingRow
              label="Did quality hold up when they pushed for speed?"
              options={QUALITY_AT_SPEED_OPTIONS}
              value={qualityAtSpeed}
              onChange={setQualityAtSpeed}
            />
          </FormSection>
        </>
      )}

      {/* Shared: General observations */}
      <FormSection title="General observations">
        <div className="space-y-3">
          {OBSERVATIONS.map((obs) => (
            <RatingRow
              key={obs.id}
              label={obs.label}
              options={RATING_OPTIONS}
              value={(observations[obs.id] as string) || ""}
              onChange={(v) =>
                setObservations((prev) => ({ ...prev, [obs.id]: v as RatingScale }))
              }
            />
          ))}
        </div>
      </FormSection>

      {/* Notes */}
      <FormSection title="Notes" subtitle="Anything else worth recording — context, quotes, specific incidents.">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="What stood out? Any concerns or wins?"
        />
      </FormSection>

      {/* Decision */}
      <FormSection
        title={day === 3 ? "Final recommendation" : "End-of-day verdict"}
        subtitle={
          forcedDecision
            ? "Auto-DQ flag is checked — decision is forced."
            : "Binary call. Required to submit."
        }
      >
        <div className="flex flex-wrap gap-2">
          {decisionOptionsForDay(day).map((opt) => {
            const selected = effectiveDecision === opt.value;
            const disabled = forcedDecision !== null && forcedDecision !== opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => setDecision(opt.value)}
                className={cn(
                  "px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-colors",
                  selected && opt.tone === "green" && "border-emerald-500 bg-emerald-50 text-emerald-700",
                  selected && opt.tone === "red" && "border-red-500 bg-red-50 text-red-700",
                  !selected && !disabled && "border-gray-200 text-gray-600 hover:bg-gray-50",
                  disabled && "border-gray-100 text-gray-300 cursor-not-allowed"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </FormSection>

      {/* Submit */}
      <div className="flex justify-end pt-2 border-t border-gray-100">
        <Button type="submit" loading={loading} disabled={!effectiveDecision}>
          Submit Day {day} Report
        </Button>
      </div>
    </form>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FormSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function RatingRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string; tone: "green" | "amber" | "red" }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <p className="text-sm text-gray-700 flex-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const selected = value === opt.value;
          const toneClasses = selected
            ? opt.tone === "green"
              ? "border-emerald-400 bg-emerald-50 text-emerald-700"
              : opt.tone === "amber"
                ? "border-amber-400 bg-amber-50 text-amber-700"
                : "border-red-400 bg-red-50 text-red-700"
            : "border-gray-200 text-gray-600 hover:bg-gray-50";
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-md border text-xs font-medium transition-colors whitespace-nowrap",
                toneClasses
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Submitted Summary (read-only view of a past day) ─────────────────────────

function SubmittedSummary({ submission, day }: { submission: DayReport; day: number }) {
  const decisionTone = ["CONTINUE", "HIRE"].includes(submission.decision)
    ? "bg-emerald-100 text-emerald-700"
    : "bg-red-100 text-red-700";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${decisionTone}`}>
          {decisionLabel(submission.decision)}
        </span>
        {submission.autoDqFlags.length > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
            {submission.autoDqFlags.length} auto-DQ flag{submission.autoDqFlags.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {submission.notes && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Notes</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.notes}</p>
        </div>
      )}
      <p className="text-[11px] text-gray-400">
        Day {day} · Submitted {new Date(submission.submittedAt).toLocaleString()} by{" "}
        {submission.evaluator.name}
      </p>
    </div>
  );
}
