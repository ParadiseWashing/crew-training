// Shared definitions for the 3-Day Working Interview form.
// Both API routes and UI import from here so field IDs stay in sync.

// Services and general observations are a straight pass/fail call — there is no
// middle option on purpose, so a crew lead has to commit to a judgement.
export type PassFail = "PASS" | "FAIL";

export const PASS_FAIL_OPTIONS: { value: PassFail; label: string; tone: "green" | "red" }[] = [
  { value: "PASS", label: "Pass", tone: "green" },
  { value: "FAIL", label: "Fail", tone: "red" },
];

export function isPassFail(v: unknown): v is PassFail {
  return v === "PASS" || v === "FAIL";
}

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

// Special "no DQ triggers occurred" code. Selecting this is required to advance.
// Mutually exclusive with the 7 real DQ flags in the UI.
export const NONE_OF_ABOVE_CODE = "NONE_OF_ABOVE";

/**
 * Returns true if the array of selected flag codes includes any real DQ trigger
 * (i.e. anything other than NONE_OF_ABOVE). Used by both client and server to
 * decide whether a DQ decision is forced.
 */
export function hasRealDqFlag(codes: string[]): boolean {
  return codes.some((c) => c !== NONE_OF_ABOVE_CODE);
}

/**
 * The catalogue a crew lead picks from when recording what the candidate
 * actually worked on that day. A day can cover more than one service, so the
 * form lets them add as many rows as they need — each rated pass/fail.
 */
export const SERVICES = [
  { id: "pressure_washing", label: "Pressure washing" },
  { id: "windows", label: "Windows" },
  { id: "tracks", label: "Window tracks" },
  { id: "floors", label: "Floors" },
  { id: "cabinets", label: "Cabinets" },
  { id: "shelves", label: "Shelves" },
  { id: "baseboards", label: "Baseboards" },
  { id: "light_fixtures", label: "Light fixtures" },
  { id: "paint_removal", label: "Paint removal" },
  { id: "doors_frames", label: "Doors & frames" },
  { id: "countertops", label: "Countertops" },
  { id: "mirrors_glass", label: "Mirrors & glass" },
  { id: "bathrooms", label: "Bathrooms & fixtures" },
  { id: "appliances", label: "Appliances" },
  { id: "dusting", label: "Dusting — high & low" },
  { id: "vacuuming", label: "Vacuuming" },
  { id: "sweep_mop", label: "Sweep & mop" },
  { id: "debris_removal", label: "Trash & debris removal" },
  { id: "final_detail", label: "Final detail / touch-up" },
] as const;

export type ServiceId = (typeof SERVICES)[number]["id"];

export const SERVICE_IDS = new Set<string>(SERVICES.map((s) => s.id));

export function serviceLabel(id: string): string {
  return SERVICES.find((s) => s.id === id)?.label ?? id;
}

/**
 * One row of the task-performance section. `label` is snapshotted at submit
 * time so a historical report still reads correctly if the catalogue above is
 * later renamed or trimmed.
 */
export interface ServiceRating {
  id: string;
  label: string;
  rating: PassFail;
}

// ─── Legacy shape (pre-service-dropdown reports) ─────────────────────────────
// Days submitted before the change stored `ratings.tasks` keyed by a fixed
// 3-task list, rated on a 3-tier scale. Kept only so the admin views can still
// render those records — never offered in the form.

export const LEGACY_DAY_TASKS = [
  { id: "vacuum", label: "Vacuum cabinets & shelves" },
  { id: "wipedown", label: "Wipedown of cabinets & shelves" },
  { id: "paint_removal", label: "Paint removal" },
];

const LEGACY_VALUE_LABELS: Record<string, string> = {
  STRONG: "Strong",
  ACCEPTABLE: "Acceptable",
  NEEDS_WORK: "Needs Work",
  NO: "No re-teach",
  PARTIAL: "Partial re-teach",
  YES: "Needed re-teach",
};

/**
 * Renders any stored rating value — current PASS/FAIL or a legacy 3-tier value.
 */
export function displayRating(value: string | undefined | null): string {
  if (!value) return "—";
  if (value === "PASS") return "Pass";
  if (value === "FAIL") return "Fail";
  return LEGACY_VALUE_LABELS[value] ?? value;
}

/** Tone for a stored rating value, covering legacy values too. */
export function ratingTone(value: string | undefined | null): "green" | "amber" | "red" | "gray" {
  if (!value) return "gray";
  if (value === "PASS" || value === "STRONG" || value === "NO") return "green";
  if (value === "FAIL" || value === "NEEDS_WORK" || value === "YES") return "red";
  if (value === "ACCEPTABLE" || value === "PARTIAL") return "amber";
  return "gray";
}

// Shared 4-item observations rated all 3 days, pass/fail.
export const OBSERVATIONS = [
  { id: "punctuality", label: "Punctuality / arrival" },
  { id: "coaching", label: "Receptive to coaching" },
  { id: "safety_ppe", label: "Uniform, Safety, & PPE compliance" },
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
