import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline" | "accent";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-[#F1EEEA] text-[#34302C]",
    success: "bg-[#E2F2E6] text-[#3F8556]",
    warning: "bg-[#FAEBCF] text-[#A87317]",
    danger: "bg-[#FCE4E5] text-[#C53438]",
    info: "bg-[#E1EAF7] text-[#3A639C]",
    outline: "border border-[#D9D3CC] text-[#34302C]",
    accent: "bg-[#FEF5EC] text-[#D9701F]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
