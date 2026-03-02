import React from "react";
import { cn } from "../lib/cn";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("rounded-xl bg-white shadow-card border border-slate-100", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";


