import React from "react";
import { cn } from "../lib/cn";

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  footer
}: {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}) {
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (!open) return;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-foreground/25"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div className="absolute left-1/2 top-1/2 w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-2xl border border-border bg-card shadow-card">
          <div className="px-5 pt-5">
            <div className="text-lg font-semibold text-foreground">{title}</div>
            {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
          </div>
          <div className="px-5 py-4">{children}</div>
          {footer ? <div className={cn("px-5 pb-5")}>{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}




