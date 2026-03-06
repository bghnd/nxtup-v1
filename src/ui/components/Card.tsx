import React from "react";
import { cn } from "../lib/cn";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  flat?: boolean;
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, flat, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("rounded-xl", !flat && "bg-card shadow-card dark:shadow-card-dark border border-border", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";


