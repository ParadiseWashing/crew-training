"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Trash2,
  Check,
  AlertTriangle,
  Minus,
} from "lucide-react";

export interface SignOffRow {
  id: string;
  weekNumber: number;
  decision: "PASSED" | "FAILED";
  notes: string | null;
  trainerSignedName: string;
  signedAt: string;
  trainee: { id: string; name: string; email: string };
  trainerName: string;
  subject: { id: string; title: string };
  ratings: { topicId: string; topicTitle: string; rating: "PASS" | "NEEDS_WORK" }[];
}

export interface SubjectCoverage {
  subjectId: string;
  subjectTitle: string;
  weeks: number[];
  trainees: {
    id: string;
    name: string;
    cells: { week: number; decision: "PASSED" | "FAILED" | null }[];
  }[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CoverageGrid({ coverage }: { coverage: SubjectCoverage[] }) {
  if (coverage.length === 0) return null;

  return (
    <div className="space-y-6">
      {coverage.map((c) => (
        <div key={c.subjectId} className="rounded-xl border border-[#E8E4DE] bg-white p-4">
          <h3 className="text-sm font-semibold text-[#0E0E0E] mb-3">{c.subjectTitle}</h3>
          {c.trainees.length === 0 ? (
            <p className="text-xs text-[#BDB6AD]">No one is assigned to this module yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="pb-2 pr-4 text-xs font-medium text-[#6E665D]">Trainee</th>
                    {c.weeks.map((w) => (
                      <th key={w} className="pb-2 px-2 text-xs font-medium text-[#6E665D] text-center">
                        Wk {w}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {c.trainees.map((t) => (
                    <tr key={t.id} className="border-t border-[#F1EEEA]">
                      <td className="py-2 pr-4 text-[#0E0E0E] whitespace-nowrap">{t.name}</td>
                      {t.cells.map((cell) => (
                        <td key={cell.week} className="py-2 px-2 text-center">
                          <span
                            className={cn(
                              "inline-flex h-6 w-6 items-center justify-center rounded-full",
                              cell.decision === "PASSED" && "bg-[#E2F2E6] text-[#3F8556]",
                              cell.decision === "FAILED" && "bg-[#FCE4E5] text-[#C53438]",
                              !cell.decision && "bg-[#F1EEEA] text-[#BDB6AD]"
                            )}
                            title={
                              cell.decision === "PASSED"
                                ? "Passed"
                                : cell.decision === "FAILED"
                                  ? "Failed"
                                  : "Not signed off"
                            }
                          >
                            {cell.decision === "PASSED" ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : cell.decision === "FAILED" ? (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            ) : (
                              <Minus className="h-3.5 w-3.5" />
                            )}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SignOffCard({ row }: { row: SignOffRow }) {
  const router = useRouter();
  const { toast } = useToast();
  const [expanded, setExpanded] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function remove() {
    if (
      !confirm(
        `Delete the week ${row.weekNumber} sign-off for ${row.trainee.name}? This is recorded in the admin audit log and the trainer will need to re-sign.`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/weekly-signoffs/${row.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Sign-off deleted.", "success");
      router.refresh();
    } catch {
      toast("Could not delete this sign-off.", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#E8E4DE] bg-white">
      <div className="flex items-start justify-between gap-3 p-4">
        <button onClick={() => setExpanded((v) => !v)} className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#0E0E0E]">{row.trainee.name}</span>
            <Badge variant={row.decision === "PASSED" ? "success" : "danger"}>
              Week {row.weekNumber} · {row.decision === "PASSED" ? "Passed" : "Failed"}
            </Badge>
          </div>
          <p className="text-xs text-[#6E665D] mt-1">
            {row.subject.title} · signed by {row.trainerName} on {formatDate(row.signedAt)}
          </p>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[#BDB6AD] hover:text-[#6E665D] p-1"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={remove}
            loading={deleting}
            className="gap-1.5 text-xs text-[#C53438]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#E8E4DE] p-4 space-y-3">
          {row.ratings.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6E665D] mb-2">
                Topic ratings
              </p>
              <div className="space-y-1">
                {row.ratings.map((r) => (
                  <div key={r.topicId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-[#34302C]">{r.topicTitle}</span>
                    <Badge variant={r.rating === "PASS" ? "success" : "warning"}>
                      {r.rating === "PASS" ? "Pass" : "Needs work"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          {row.notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6E665D] mb-1">
                Trainer notes
              </p>
              <p className="text-sm text-[#34302C] whitespace-pre-wrap">{row.notes}</p>
            </div>
          )}
          <p className="text-xs text-[#BDB6AD]">
            Trainer signature: <span className="font-medium text-[#6E665D]">{row.trainerSignedName}</span>
          </p>
        </div>
      )}
    </div>
  );
}

export function WeeklySignOffsClient({
  rows,
  coverage,
}: {
  rows: SignOffRow[];
  coverage: SubjectCoverage[];
}) {
  const [tab, setTab] = React.useState<"coverage" | "records">("coverage");
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.trainee.name.toLowerCase().includes(q) ||
        r.subject.title.toLowerCase().includes(q) ||
        r.trainerName.toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["coverage", "records"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex items-center min-h-11 sm:min-h-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              tab === key ? "bg-[#FEF5EC] text-[#D9701F]" : "text-[#6E665D] hover:bg-[#F7F5F2]"
            )}
          >
            {key === "coverage" ? "Coverage" : `All Records (${rows.length})`}
          </button>
        ))}
      </div>

      {tab === "coverage" ? (
        coverage.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-[#E8E4DE] rounded-xl">
            <CalendarCheck className="h-10 w-10 text-[#E8E4DE] mb-3" />
            <p className="text-sm font-medium text-[#6E665D]">No multi-week modules yet</p>
            <p className="text-xs text-[#BDB6AD] mt-1">
              Give a module&apos;s topics week numbers and its weekly sign-off grid appears here.
            </p>
          </div>
        ) : (
          <CoverageGrid coverage={coverage} />
        )
      ) : (
        <div className="space-y-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by trainee, module or trainer…"
            className="w-full rounded-lg border border-[#E8E4DE] bg-white px-3 py-2 text-sm text-[#0E0E0E] focus:outline-none focus:ring-2 focus:ring-[#F08A3E] focus:border-[#F08A3E]"
          />
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#E8E4DE] rounded-xl">
              <CalendarCheck className="h-10 w-10 text-[#E8E4DE] mb-3" />
              <p className="text-sm font-medium text-[#6E665D]">No sign-offs recorded</p>
            </div>
          ) : (
            filtered.map((r) => <SignOffCard key={r.id} row={r} />)
          )}
        </div>
      )}
    </div>
  );
}
