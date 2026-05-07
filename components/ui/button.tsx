"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "success";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", loading, children, disabled, ...props }, ref) => {
    const base = "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]";

    const variants = {
      default: "bg-[#F08A3E] text-white hover:bg-[#D9701F] focus:ring-[#F08A3E] shadow-sm",
      secondary: "bg-[#F1EEEA] text-[#0E0E0E] hover:bg-[#E8E4DE] focus:ring-[#D9D3CC]",
      outline: "border border-[#E8E4DE] bg-white text-[#0E0E0E] hover:bg-[#F7F5F2] focus:ring-[#D9D3CC]",
      ghost: "text-[#34302C] hover:bg-[#F7F5F2] hover:text-[#0E0E0E] focus:ring-[#D9D3CC]",
      destructive: "bg-[#E5484D] text-white hover:bg-[#C53438] focus:ring-[#E5484D]",
      success: "bg-[#4FA66B] text-white hover:bg-[#3F8556] focus:ring-[#4FA66B]",
    };

    const sizes = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-11 px-6 text-base",
      icon: "h-9 w-9 rounded-lg",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
