import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  className?: string;
  barClassName?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Progress({ value, className, barClassName, showLabel, size = "md" }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-4" };

  const color =
    clamped === 100
      ? "bg-green-500"
      : clamped > 50
      ? "bg-accent"
      : clamped > 0
      ? "bg-amber-500"
      : "bg-gray-200";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("flex-1 bg-gray-100 rounded-full overflow-hidden", heights[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", color, barClassName)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-gray-500 w-9 text-right">{clamped}%</span>
      )}
    </div>
  );
}
