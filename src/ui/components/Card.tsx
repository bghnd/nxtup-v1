import React from "react";
import { cn } from "../lib/cn";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-xl bg-white shadow-card border border-slate-100", className)}
      {...props}
    >
      {children}
    </div>
  );
}


