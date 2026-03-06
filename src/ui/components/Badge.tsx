import React from "react";
import { cn } from "../lib/cn";

type Variant = "neutral" | "low" | "medium" | "high" | "critical";

export function Badge({
  className,
  variant = "neutral",
  children
}: {
  className?: string;
  variant?: Variant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variant === "neutral" && "bg-accent text-foreground-muted",
        variant === "low" && "bg-emerald-50 text-emerald-700",
        variant === "medium" && "bg-amber-50 text-amber-700",
        variant === "high" && "bg-orange-50 text-orange-700",
        variant === "critical" && "bg-rose-50 text-rose-700",
        className
      )}
    >
      {children}
    </span>
  );
}




