import * as React from "react";
import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
  xl: "h-16 w-16 text-xl",
};

// Paradise-friendly palette — warm tones rotating around brand orange
const colors = [
  "bg-[#F08A3E]", // orange (brand)
  "bg-[#0E0E0E]", // black (brand)
  "bg-[#4FA66B]", // green
  "bg-[#E8A23B]", // amber
  "bg-[#4D7FBF]", // blue
  "bg-[#7E5BD9]", // purple
  "bg-[#D9701F]", // deep orange
  "bg-[#34302C]", // espresso
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ name, image, size = "md", className }: AvatarProps) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={cn("rounded-full object-cover", sizeMap[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0",
        sizeMap[size],
        getColor(name),
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
