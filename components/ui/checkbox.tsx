"use client";
import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: string;
}

export function Checkbox({ className, label, id, ...props }: CheckboxProps) {
  return (
    <div className="flex items-center gap-2">
      <CheckboxPrimitive.Root
        id={id}
        className={cn(
          "h-4 w-4 rounded border border-gray-300 transition-colors flex-shrink-0",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
          "data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center">
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label && (
        <label htmlFor={id} className="text-sm text-gray-700 cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
}
