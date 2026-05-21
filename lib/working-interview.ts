// Shared definitions for the 3-Day Working Interview form.
// Both API routes and UI import from here so field IDs stay in sync.

export type RatingScale = "STRONG" | "ACCEPTABLE" | "NEEDS_WORK";

export const RATING_OPTIONS: { value: RatingScale; label: string; tone: "green" | "amber" | "red" }[] = [
  { value: "STRONG", label: "Strong", tone: "green" },
  { value: "ACCEPTABLE", label: "Acceptable", tone: "amber" },
  { value: "NEEDS_WORK", label: "Needs Work", tone: "red" },
];

export type RetentionScale = "NO" | "PARTIAL" | "YES";

export const RETENTION_OPTIONS: { value: RetentionScale; label: string; tone: "green" | "amber" | "red" }[] = [
  { value: "NO", label: "No re-teach", tone: "green" },
  { value: "PARTIAL", label: "Partial re-teach", tone: "amber" },
  { value: "YES", label: "Needed re-teach", tone: "red" },
];

// The 7 automatic disqualifiers from the SOP. Any flag = forced DQ.
export const AUTO_DQ_FLAGS = [
  { code: "NO_CALL_NO_SHOW", label: "No-call no-show" },
  { code: "LATE_WITHOUT_NOTICE", label: "Late without notice" },
  { code: "VISIBLY_INTOXICATED", label: "Visibly intoxicated" },
  { code: "HOSTILE", label: "Hostile to crew / customer / PM" },
  { code: "MATERIAL_LIE", label: "Caught in a material lie" },
  { code: "REFUSED_TASK", label: "Refused an assigned task" },
  { code: "SAFETY_VIOLATION", label: "Safety violation ignored after correction" },
] as const;

export type AutoDqCode = (typeof AUTO_DQ_FLAGS)[number]["code"];

// Day 1 — Taught. Tasks taught & executed under direct supervision.
export const DAY_1_TASKS = [
  { id: "vacuum", label: "Vacuum cabinets & shelves" },
  { id: "wipedown", label: "Wipedown of cabinets & shelves" },
  { id: "paint_removal", label: "Paint removal" },
];

// Day 2 — Tested. Same tasks, rated on retention (was a re-teach needed?).
export const DAY_2_TASKS = DAY_1_TASKS;

// Shared 4-item observations rated all 3 days on the same scale.
export const OBSERVATIONS = [
  { id: "punctuality", label: "Punctuality / arrival" },
  { id: "coaching", label: "Receptive to coaching" },
  { id: "safety_ppe", label: "Safety & PPE compliance" },
  { id: "effort", label: "Effort & pace" },
];

// Day 3-only fields.
export const PRODUCTION_SPEED_OPTIONS = [
  { value: "NEAR_CREW", label: "Near crew speed", tone: "green" as const },
  { value: "ACCEPTABLE", label: "Slower but acceptable", tone: "amber" as const },
  { value: "TOO_SLOW", label: "Too slow", tone: "red" as const },
];

export const QUALITY_AT_SPEED_OPTIONS = [
  { value: "YES", label: "Yes — held up", tone: "green" as const },
  { value: "PARTIAL", label: "Partial — some misses", tone: "amber" as const },
  { value: "NO", label: "No — quality dropped", tone: "red" as const },
];

// Helpers for choosing the right decision options per day.
export function decisionOptionsForDay(day: number): { value: "CONTINUE" | "DQ" | "HIRE" | "DO_NOT_HIRE"; label: string; tone: "green" | "red" }[] {
  if (day === 3) {
    return [
      { value: "HIRE", label: "Recommend Hire", tone: "green" },
      { value: "DO_NOT_HIRE", label: "Do Not Hire", tone: "red" },
    ];
  }
  return [
    { value: "CONTINUE", label: "Continue", tone: "green" },
    { value: "DQ", label: "DQ", tone: "red" },
  ];
}

// Forced decision when any auto-DQ flag is checked.
export function forcedDecisionForDay(day: number): "DQ" | "DO_NOT_HIRE" {
  return day === 3 ? "DO_NOT_HIRE" : "DQ";
}

// Pretty labels for status.
export const STATUS_LABELS = {
  IN_PROGRESS: { label: "In Progress", tone: "gray" as const },
  PASSED: { label: "Needs Onboarding", tone: "green" as const },
  DISQUALIFIED: { label: "DQ", tone: "red" as const },
};
