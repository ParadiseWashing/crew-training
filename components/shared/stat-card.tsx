import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: "blue" | "green" | "amber" | "purple";
  className?: string;
}

// Note: keeping the prop name "blue" for backwards compatibility with existing
// callers — it now renders with the Paradise orange accent.
const colorMap = {
  blue: { bg: "bg-accent-tint", text: "text-accent", icon: "bg-accent-soft text-accent-hover" },
  green: { bg: "bg-emerald-50", text: "text-success", icon: "bg-emerald-100 text-success" },
  amber: { bg: "bg-amber-50", text: "text-warning", icon: "bg-amber-100 text-warning" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", icon: "bg-purple-100 text-purple-600" },
};

export function StatCard({ label, value, icon, trend, color = "blue", className }: StatCardProps) {
  const colors = colorMap[color];

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className={cn("text-3xl font-bold mt-1", colors.text)}>{value}</p>
          {trend && (
            <p className="text-xs text-muted mt-1">
              <span className={trend.value >= 0 ? "text-success" : "text-destructive"}>
                {trend.value >= 0 ? "+" : ""}{trend.value}%
              </span>{" "}
              {trend.label}
            </p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-xl", colors.icon)}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
