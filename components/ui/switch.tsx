"use client";
import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label?: string;
  description?: string;
}

export function Switch({ className, label, description, ...props }: SwitchProps) {
  return (
    <div className="flex items-center gap-3">
      <SwitchPrimitive.Root
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
          "bg-gray-200 data-[state=checked]:bg-accent",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            "translate-x-1 data-[state=checked]:translate-x-6"
          )}
        />
      </SwitchPrimitive.Root>
      {(label || description) && (
        <div>
          {label && <p className="text-sm font-medium text-gray-700">{label}</p>}
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      )}
    </div>
  );
}
