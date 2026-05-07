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

  // Paradise palette: red (low) → orange (mid) → green (done)
  const color =
    clamped === 100
      ? "bg-[#4FA66B]"
      : clamped >= 80
      ? "bg-[#4FA66B]"
      : clamped >= 35
      ? "bg-[#F08A3E]"
      : clamped > 0
      ? "bg-[#E5484D]"
      : "bg-[#E8E4DE]";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("flex-1 bg-[#F1EEEA] rounded-full overflow-hidden", heights[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", color, barClassName)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold text-[#0E0E0E] w-9 text-right">{clamped}%</span>
      )}
    </div>
  );
}
