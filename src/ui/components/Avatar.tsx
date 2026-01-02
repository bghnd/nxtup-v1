import React from "react";
import { cn } from "../lib/cn";

export function Avatar({
  className,
  name,
  src
}: {
  className?: string;
  name: string;
  src?: string | null;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

  return (
    <div
      className={cn(
        "relative inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700",
        className
      )}
      title={name}
      aria-label={name}
    >
      {src ? (
        <img className="h-full w-full object-cover" alt={name} src={src} />
      ) : (
        initials
      )}
    </div>
  );
}




