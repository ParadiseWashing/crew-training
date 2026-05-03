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

const colorMap = {
  blue: { bg: "bg-blue-50", text: "text-blue-600", icon: "bg-blue-100 text-blue-600" },
  green: { bg: "bg-emerald-50", text: "text-emerald-600", icon: "bg-emerald-100 text-emerald-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", icon: "bg-amber-100 text-amber-600" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", icon: "bg-purple-100 text-purple-600" },
};

export function StatCard({ label, value, icon, trend, color = "blue", className }: StatCardProps) {
  const colors = colorMap[color];

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className={cn("text-3xl font-bold mt-1", colors.text)}>{value}</p>
          {trend && (
            <p className="text-xs text-gray-500 mt-1">
              <span className={trend.value >= 0 ? "text-green-600" : "text-red-500"}>
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
