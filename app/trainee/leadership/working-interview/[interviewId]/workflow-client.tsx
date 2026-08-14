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
  Plus,
  X,
} from "lucide-react";
import {
  AUTO_DQ_FLAGS,
  SERVICES,
  OBSERVATIONS,
  PASS_FAIL_OPTIONS,
  PRODUCTION_SPEED_OPTIONS,
  QUALITY_AT_SPEED_OPTIONS,
  NONE_OF_ABOVE_CODE,
  hasRealDqFlag,
  decisionOptionsForDay,
  forcedDecisionForDay,
  type PassFail,
  type ServiceRating,
} from "@/lib/working-interview";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A service row while the form is being filled in — rating not yet chosen. */
type DraftServiceRating = Omit<ServiceRating, "rating"> & { rating: PassFail | "" };

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
  1: "Teach each service you put them on. Candidate executes under direct supervision; you correct in real time.",
  2: "Same services as day 1 where you can. No re-teaching — test retention, pace, and quality at speed.",
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
  // Services worked that day, in the order the lead added them. `rating` starts
  // empty and must be filled before the day can be submitted.
  const [services, setServices] = React.useState<DraftServiceRating[]>([]);
  const [observations, setObservations] = React.useState<Record<string, PassFail | "">>({});
  // Day 3-only
  const [ownerVisitConfirmed, setOwnerVisitConfirmed] = React.useState<boolean | null>(null);
  const [productionSpeed, setProductionSpeed] = React.useState<string>("");
  const [qualityAtSpeed, setQualityAtSpeed] = React.useState<string>("");
  // Day 2-only
  const [paceAtSpeed, setPaceAtSpeed] = React.useState<PassFail | "">("");
  // Shared
  const [notes, setNotes] = React.useState("");
  const [decision, setDecision] = React.useState<"CONTINUE" | "DQ" | "HIRE" | "DO_NOT_HIRE" | "">("");

  // Decision is forced to DQ only when a REAL disqualifier is checked.
  // "None of the above" never forces DQ.
  const realDqChecked = hasRealDqFlag(autoDqFlags);
  const forcedDecision = realDqChecked ? forcedDecisionForDay(day) : null;
  const effectiveDecision = forcedDecision ?? decision;

  /**
   * Toggling auto-DQ flags has mutex behavior:
   * - Selecting any of the 7 DQ flags clears NONE_OF_ABOVE.
   * - Selecting NONE_OF_ABOVE clears all DQ flags.
   * That way the section always represents a coherent answer.
   */
  function toggleFlag(code: string) {
    setAutoDqFlags((prev) => {
      const already = prev.includes(code);
      if (code === NONE_OF_ABOVE_CODE) {
        // Toggling NONE → either select only NONE, or clear everything.
        return already ? [] : [NONE_OF_ABOVE_CODE];
      }
      // Toggling a real DQ flag → also drop NONE if it was set.
      const withoutNone = prev.filter((c) => c !== NONE_OF_ABOVE_CODE);
      return already ? withoutNone.filter((c) => c !== code) : [...withoutNone, code];
    });
    // Clear a previously chosen "Continue" decision if a real DQ flag becomes checked,
    // since the UI will lock it to DQ anyway.
    if (code !== NONE_OF_ABOVE_CODE && decision && ["CONTINUE", "HIRE"].includes(decision)) {
      setDecision("");
    }
  }

  // Day 3 is a production day — no service-by-service rating, it's judged on
  // speed and whether quality held up.
  const tracksServices = day === 1 || day === 2;

  // Only offer services that haven't been added yet, so a day can't list the
  // same service twice.
  const availableServices = SERVICES.filter((s) => !services.some((sel) => sel.id === s.id));

  /** Returns a list of human-readable missing field names. Empty = ready to submit. */
  function missingFields(): string[] {
    const missing: string[] = [];

    if (autoDqFlags.length === 0) {
      missing.push("Automatic disqualifiers (pick at least one, or \"None of the above\")");
    }

    if (tracksServices) {
      if (services.length === 0) {
        missing.push("Services worked (add at least one)");
      }
      for (const s of services) {
        if (!s.rating) missing.push(`Service — ${s.label}`);
      }
    }

    if (day === 2 && !paceAtSpeed) {
      missing.push("Pace & quality at speed");
    }

    if (day === 3) {
      if (ownerVisitConfirmed === null) missing.push("Owner site visit");
      if (!productionSpeed) missing.push("Production speed");
      if (!qualityAtSpeed) missing.push("Quality at speed");
    }

    for (const obs of OBSERVATIONS) {
      if (!observations[obs.id]) {
        missing.push(`Observation — ${obs.label}`);
      }
    }

    if (!effectiveDecision) {
      missing.push(day === 3 ? "Final recommendation" : "End-of-day verdict");
    }

    return missing;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const missing = missingFields();
    if (missing.length > 0) {
      const msg =
        missing.length === 1
          ? `Please complete: ${missing[0]}`
          : `${missing.length} required fields are still empty. First: ${missing[0]}`;
      toast(msg, "error");
      return;
    }

    const ratings: Record<string, unknown> = {
      services: tracksServices ? services : [],
      observations,
    };
    if (day === 2) ratings.paceAtSpeed = paceAtSpeed;
    if (day === 3) {
      ratings.ownerVisitConfirmed = ownerVisitConfirmed;
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
      <FormSection
        title="Automatic disqualifiers"
        subtitle={
          'Pick "None of the above" if nothing happened today. Any other selection = automatic DQ.'
        }
      >
        <div className="space-y-1.5">
          {AUTO_DQ_FLAGS.map((flag) => {
            const checked = autoDqFlags.includes(flag.code);
            return (
              <label
                key={flag.code}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 min-h-11 rounded-lg border cursor-pointer transition-colors",
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

          {/* "None of the above" — the only safe option. Mutex with the 7 above. */}
          {(() => {
            const noneChecked = autoDqFlags.includes(NONE_OF_ABOVE_CODE);
            return (
              <label
                className={cn(
                  "flex items-center gap-3 px-3 py-2 min-h-11 rounded-lg border cursor-pointer transition-colors mt-2",
                  noneChecked
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={noneChecked}
                  onChange={() => toggleFlag(NONE_OF_ABOVE_CODE)}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                />
                <span
                  className={cn(
                    "text-sm",
                    noneChecked ? "text-emerald-900 font-medium" : "text-gray-700"
                  )}
                >
                  None of the above
                </span>
              </label>
            );
          })()}
        </div>
      </FormSection>

      {/* Day 1 & 2: Services worked, chosen by the lead */}
      {tracksServices && (
        <FormSection
          title={day === 2 ? "Service retention" : "Service performance"}
          subtitle={
            day === 2
              ? "Add each service they worked today and mark whether they held it without a re-teach."
              : "Add each service they worked today and mark it pass or fail."
          }
        >
          <div className="space-y-3">
            <ServicePicker
              available={availableServices}
              onAdd={(svc) =>
                setServices((prev) => [...prev, { id: svc.id, label: svc.label, rating: "" }])
              }
            />

            {services.length === 0 ? (
              <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg px-3 py-4 text-center">
                No services added yet — pick one above to start.
              </p>
            ) : (
              <div className="space-y-2">
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <p className="text-sm text-gray-700 flex-1">{svc.label}</p>
                    <div className="flex items-center gap-2">
                      {PASS_FAIL_OPTIONS.map((opt) => {
                        const selected = svc.rating === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setServices((prev) =>
                                prev.map((s) =>
                                  s.id === svc.id ? { ...s, rating: opt.value } : s
                                )
                              )
                            }
                            className={cn(
                              // Leads fill this out one-handed on a job site, so
                              // phones get a full 44px target and the two options
                              // split the row. Desktop keeps the compact chip.
                              "flex-1 sm:flex-none inline-flex items-center justify-center min-h-11 sm:min-h-0 px-4 sm:px-3 sm:py-1.5 rounded-md border text-sm sm:text-xs font-medium transition-colors whitespace-nowrap",
                              selected && opt.tone === "green"
                                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                                : selected
                                  ? "border-red-400 bg-red-50 text-red-700"
                                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                      {/* Destructive, and it sits next to "Fail" — keep it a full
                          touch target and set apart so it can't be mis-tapped. */}
                      <button
                        type="button"
                        onClick={() => setServices((prev) => prev.filter((s) => s.id !== svc.id))}
                        aria-label={`Remove ${svc.label}`}
                        className="shrink-0 ml-1 inline-flex items-center justify-center min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 sm:p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FormSection>
      )}

      {/* Day 2: Pace at speed */}
      {day === 2 && (
        <FormSection title="Pace & quality at speed">
          <RatingRow
            label="How did they hold up at speed?"
            options={PASS_FAIL_OPTIONS}
            value={paceAtSpeed}
            onChange={(v) => setPaceAtSpeed(v as PassFail)}
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
      <FormSection title="General observations" subtitle="Pass or fail on each.">
        <div className="space-y-3">
          {OBSERVATIONS.map((obs) => (
            <RatingRow
              key={obs.id}
              label={obs.label}
              options={PASS_FAIL_OPTIONS}
              value={(observations[obs.id] as string) || ""}
              onChange={(v) =>
                setObservations((prev) => ({ ...prev, [obs.id]: v as PassFail }))
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
                  "inline-flex items-center justify-center min-h-11 px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-colors",
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

/**
 * Dropdown of services not yet on the report. Resets to the placeholder after
 * each pick so the lead can add several in a row without extra clicks.
 */
function ServicePicker({
  available,
  onAdd,
}: {
  available: readonly { id: string; label: string }[];
  onAdd: (svc: { id: string; label: string }) => void;
}) {
  if (available.length === 0) {
    return (
      <p className="text-xs text-gray-400">All services have been added to this day.</p>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <select
          value=""
          onChange={(e) => {
            const svc = available.find((s) => s.id === e.target.value);
            if (svc) onAdd({ id: svc.id, label: svc.label });
          }}
          className="w-full appearance-none rounded-lg border border-gray-200 bg-white pl-9 pr-8 min-h-11 sm:min-h-0 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        >
          <option value="">Add a service worked today…</option>
          {available.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 rotate-90 pointer-events-none" />
      </div>
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
      <div className="flex flex-wrap gap-2 sm:gap-1.5">
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
                // Matches the service rows: 44px targets on phones, compact chips
                // from sm: up. flex-1 keeps a 2-option row evenly split.
                "flex-1 sm:flex-none inline-flex items-center justify-center min-h-11 sm:min-h-0 px-4 sm:px-3 sm:py-1.5 rounded-md border text-sm sm:text-xs font-medium transition-colors whitespace-nowrap",
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

  // Count ONLY real DQ triggers — "None of the above" is the safe answer and
  // shouldn't appear as a triggered flag.
  const realDqFlagCount = submission.autoDqFlags.filter(
    (c) => c !== NONE_OF_ABOVE_CODE
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${decisionTone}`}>
          {decisionLabel(submission.decision)}
        </span>
        {realDqFlagCount > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
            {realDqFlagCount} auto-DQ flag{realDqFlagCount === 1 ? "" : "s"}
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
