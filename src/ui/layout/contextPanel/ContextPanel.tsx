import React from "react";
import { Pin, PinOff, X } from "lucide-react";

import { cn } from "../../lib/cn";
import { Button } from "../../components/Button";

export type PanelType = "inbox" | "activity" | "saved";

export function ContextPanel({
  panel,
  pinned,
  width,
  onResize,
  onClose,
  onTogglePinned,
  onSelectPanel,
  children
}: {
  panel: PanelType;
  pinned: boolean;
  width: number;
  onResize: (width: number) => void;
  onClose: () => void;
  onTogglePinned: () => void;
  onSelectPanel: (panel: PanelType) => void;
  children: React.ReactNode;
}) {
  const dragging = React.useRef(false);
  const startX = React.useRef(0);
  const startWidth = React.useRef(width);

  React.useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      const dx = e.clientX - startX.current;
      const next = Math.max(280, Math.min(560, startWidth.current + dx));
      onResize(next);
    }
    function onUp() {
      dragging.current = false;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onResize]);

  return (
    <section
      className="relative shrink-0 border-r border-slate-200 bg-white h-full flex flex-col"
      style={{ width }}
      aria-label="Context panel"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <div className="flex items-center gap-1">
          <TabButton active={panel === "inbox"} onClick={() => onSelectPanel("inbox")}>
            Inbox
          </TabButton>
          <TabButton active={panel === "activity"} onClick={() => onSelectPanel("activity")} disabled>
            Activity
          </TabButton>
          <TabButton active={panel === "saved"} onClick={() => onSelectPanel("saved")} disabled>
            Saved
          </TabButton>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label={pinned ? "Unpin panel" : "Pin panel"}
            title={pinned ? "Unpin panel" : "Pin panel"}
            onClick={onTogglePinned}
          >
            {pinned ? <PinOff size={18} /> : <Pin size={18} />}
          </Button>
          <Button variant="ghost" size="sm" aria-label="Close panel" title="Close panel" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">{children}</div>

      {/* resize handle */}
      <div
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent"
        role="separator"
        aria-label="Resize panel"
        onMouseDown={(e) => {
          dragging.current = true;
          startX.current = e.clientX;
          startWidth.current = width;
        }}
      />
    </section>
  );
}

function TabButton({
  active,
  disabled,
  children,
  onClick
}: {
  active: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "rounded-md px-2 py-1 text-xs font-medium transition-colors",
        active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50",
        disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}



