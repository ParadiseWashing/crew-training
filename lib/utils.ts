import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    COMPANY: "Company",
    POLICIES: "Policies",
    PROCESSES: "Processes",
  };
  return map[category] ?? category;
}

export function categoryColor(category: string): string {
  const map: Record<string, string> = {
    COMPANY: "bg-purple-100 text-purple-700",
    POLICIES: "bg-amber-100 text-amber-700",
    PROCESSES: "bg-blue-100 text-blue-700",
  };
  return map[category] ?? "bg-gray-100 text-gray-700";
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    NOT_STARTED: "bg-gray-100 text-gray-600",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
  };
  return map[status] ?? status;
}
