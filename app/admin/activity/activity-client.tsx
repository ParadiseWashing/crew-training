"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ActivityEvent, ActivityType } from "@/lib/activity";
import {
  Activity as ActivityIcon,
  BookOpenCheck,
  ClipboardCheck,
  FileSignature,
  AlertTriangle,
  UserPlus,
  ShieldAlert,
  PenSquare,
  CalendarCheck,
  ListChecks,
  Search,
} from "lucide-react";

const TYPE_META: Record<
  ActivityType,
  { label: string; icon: React.ReactNode }
> = {
  STEP_COMPLETED: { label: "Steps", icon: <BookOpenCheck className="h-4 w-4" /> },
  QUIZ_ATTEMPT: { label: "Quizzes", icon: <ListChecks className="h-4 w-4" /> },
  SUBJECT_SIGNOFF: { label: "Sign-Offs", icon: <ClipboardCheck className="h-4 w-4" /> },
  WEEKLY_SIGNOFF: { label: "Weekly Sign-Offs", icon: <CalendarCheck className="h-4 w-4" /> },
  HANDBOOK_SIGNED: { label: "Signatures", icon: <FileSignature className="h-4 w-4" /> },
  WORKING_INTERVIEW: { label: "Working Interviews", icon: <PenSquare className="h-4 w-4" /> },
  AUDIT_FLAG: { label: "Audit Flags", icon: <AlertTriangle className="h-4 w-4" /> },
  ASSIGNMENT: { label: "Assignments", icon: <ActivityIcon className="h-4 w-4" /> },
  USER_JOINED: { label: "People", icon: <UserPlus className="h-4 w-4" /> },
  ADMIN_ACTION: { label: "Admin Actions", icon: <ShieldAlert className="h-4 w-4" /> },
};

const TONE_DOT: Record<ActivityEvent["tone"], string> = {
  neutral: "bg-[#BDB6AD]",
  good: "bg-[#4FA66B]",
  bad: "bg-[#E5484D]",
  warn: "bg-[#F08A3E]",
};

const RANGES = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "all", label: "All time" },
] as const;

function dayKey(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function ActivityClient({ events }: { events: ActivityEvent[] }) {
  const [types, setTypes] = React.useState<Set<ActivityType>>(new Set());
  const [range, setRange] = React.useState<(typeof RANGES)[number]["key"]>("all");
  // Resolved when the range button is clicked, so the filter stays pure.
  const [cutoff, setCutoff] = React.useState(0);
  const [query, setQuery] = React.useState("");

  const presentTypes = React.useMemo(() => {
    const seen = new Set<ActivityType>();
    for (const e of events) seen.add(e.type);
    return (Object.keys(TYPE_META) as ActivityType[]).filter((t) => seen.has(t));
  }, [events]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (types.size > 0 && !types.has(e.type)) return false;
      if (cutoff && new Date(e.at).getTime() < cutoff) return false;
      if (
        q &&
        !e.personName.toLowerCase().includes(q) &&
        !e.title.toLowerCase().includes(q) &&
        !(e.detail ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [events, types, cutoff, query]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, ActivityEvent[]>();
    for (const e of filtered) {
      const key = dayKey(e.at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()];
  }, [filtered]);

  function toggleType(t: ActivityType) {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTypes(new Set())}
            className={cn(
              "inline-flex items-center min-h-11 sm:min-h-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              types.size === 0
                ? "bg-[#FEF5EC] text-[#D9701F]"
                : "text-[#6E665D] hover:bg-[#F7F5F2]"
            )}
          >
            All
          </button>
          {presentTypes.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={cn(
                "inline-flex items-center gap-1.5 min-h-11 sm:min-h-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                types.has(t)
                  ? "bg-[#FEF5EC] text-[#D9701F]"
                  : "text-[#6E665D] hover:bg-[#F7F5F2]"
              )}
            >
              {TYPE_META[t].icon}
              {TYPE_META[t].label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#BDB6AD]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by person or keyword…"
              className="w-full rounded-lg border border-[#E8E4DE] bg-white pl-9 pr-3 py-2 text-sm text-[#0E0E0E] focus:outline-none focus:ring-2 focus:ring-[#F08A3E] focus:border-[#F08A3E]"
            />
          </div>
          <div className="flex items-center gap-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => {
                  setRange(r.key);
                  setCutoff(
                    r.key === "all" ? 0 : Date.now() - Number(r.key) * 24 * 60 * 60 * 1000
                  );
                }}
                className={cn(
                  "inline-flex items-center min-h-11 sm:min-h-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  range === r.key
                    ? "bg-[#F1EEEA] text-[#0E0E0E]"
                    : "text-[#6E665D] hover:bg-[#F7F5F2]"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-[#6E665D]">
        Showing {filtered.length} event{filtered.length !== 1 ? "s" : ""}
      </p>

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-[#E8E4DE] rounded-xl">
          <ActivityIcon className="h-10 w-10 text-[#E8E4DE] mb-3" />
          <p className="text-sm font-medium text-[#6E665D]">No activity matches these filters</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, dayEvents]) => (
            <div key={day}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6E665D] mb-2">
                {day}
              </h3>
              <div className="rounded-xl border border-[#E8E4DE] bg-white divide-y divide-[#F1EEEA]">
                {dayEvents.map((e) => {
                  const body = (
                    <div className="flex items-start gap-3 p-3">
                      <span
                        className={cn("mt-1.5 h-2 w-2 rounded-full flex-shrink-0", TONE_DOT[e.tone])}
                      />
                      <div className="flex-shrink-0 text-[#BDB6AD] mt-0.5">
                        {TYPE_META[e.type].icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#0E0E0E]">
                          <span className="font-semibold">{e.personName}</span>{" "}
                          <span className="text-[#34302C]">{e.title}</span>
                        </p>
                        {e.detail && (
                          <p className="text-xs text-[#6E665D] mt-0.5">{e.detail}</p>
                        )}
                      </div>
                      <span className="text-xs text-[#BDB6AD] flex-shrink-0">{time(e.at)}</span>
                    </div>
                  );
                  return e.href ? (
                    <Link key={e.id} href={e.href} className="block hover:bg-[#F7F5F2] transition-colors">
                      {body}
                    </Link>
                  ) : (
                    <div key={e.id}>{body}</div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
