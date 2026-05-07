import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: "blue" | "green" | "amber" | "purple" | "orange" | "black";
  className?: string;
}

const colorMap = {
  orange: { text: "text-[#0E0E0E]", icon: "bg-[#FEF5EC] text-[#D9701F]" },
  black: { text: "text-[#0E0E0E]", icon: "bg-[#F1EEEA] text-[#0E0E0E]" },
  blue: { text: "text-[#0E0E0E]", icon: "bg-[#E1EAF7] text-[#3A639C]" },
  green: { text: "text-[#0E0E0E]", icon: "bg-[#E2F2E6] text-[#3F8556]" },
  amber: { text: "text-[#0E0E0E]", icon: "bg-[#FAEBCF] text-[#A87317]" },
  purple: { text: "text-[#0E0E0E]", icon: "bg-[#EDE7FA] text-[#5E40A8]" },
};

export function StatCard({ label, value, icon, trend, color = "orange", className }: StatCardProps) {
  const colors = colorMap[color];

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#6E665D]">{label}</p>
          <p className={cn("text-3xl font-bold mt-1 tracking-tight", colors.text)}>{value}</p>
          {trend && (
            <p className="text-xs text-[#6E665D] mt-1">
              <span className={trend.value >= 0 ? "text-[#4FA66B] font-semibold" : "text-[#E5484D] font-semibold"}>
                {trend.value >= 0 ? "▲ " : "▼ "}{Math.abs(trend.value)}%
              </span>{" "}
              {trend.label}
            </p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-xl shrink-0", colors.icon)}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
