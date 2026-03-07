import React from "react";
import { Pin, PinOff, X } from "lucide-react";

import { cn } from "../../lib/cn";
import { Button } from "../../components/Button";

export type PanelType = "inbox" | "activity" | "saved" | "index";

export function ContextPanel({
  panel,
  pinned,
  width,
  onResize,
  onClose,
  onTogglePinned,
  onSelectPanel,
  indexFilter,
  onIndexFilterChange,
  children
}: {
  panel: PanelType;
  pinned: boolean;
  width: number;
  onResize: (width: number) => void;
  onClose: () => void;
  onTogglePinned: () => void;
  onSelectPanel: (panel: PanelType) => void;
  indexFilter: "alpha" | "recent" | "unlisted";
  onIndexFilterChange: (filter: "alpha" | "recent" | "unlisted") => void;
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
      className="relative shrink-0 border-r border-border bg-card h-full flex flex-col"
      style={{ width }}
      aria-label="Context panel"
    >
      <div className="flex flex-col border-b border-border">
        <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1">
          <div className="flex items-center gap-1">
            <TabButton active={panel === "inbox"} onClick={() => onSelectPanel("inbox")}>
              Inbox
            </TabButton>
            <TabButton active={panel === "activity"} onClick={() => onSelectPanel("activity")}>
              Only me
            </TabButton>
            <TabButton active={panel === "saved"} onClick={() => onSelectPanel("saved")}>
              Raw feed
            </TabButton>
            <TabButton active={panel === "index"} onClick={() => onSelectPanel("index")}>
              Index
            </TabButton>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label={pinned ? "Unpin panel" : "Pin panel"}
              title={pinned ? "Unpin panel" : "Pin panel"}
              onClick={onTogglePinned}
              className="h-7 w-7 p-0"
            >
              {pinned ? <PinOff size={16} /> : <Pin size={16} />}
            </Button>
            <Button variant="ghost" size="sm" aria-label="Close panel" title="Close panel" onClick={onClose} className="h-7 w-7 p-0">
              <X size={16} />
            </Button>
          </div>
        </div>

        <div className="px-4 pb-2 pt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          {panel === "inbox" && (
            <>
              <button className="hover:text-foreground transition-colors">Unread</button>
              <span>&bull;</span>
              <button className="hover:text-foreground transition-colors">Important</button>
              <span>&bull;</span>
              <button className="hover:text-foreground transition-colors">All</button>
            </>
          )}
          {panel === "activity" && (
            <>
              <button className="hover:text-foreground transition-colors">Today</button>
              <span>&bull;</span>
              <button className="hover:text-foreground transition-colors">Upcoming</button>
              <span>&bull;</span>
              <button className="hover:text-foreground transition-colors">No date</button>
            </>
          )}
          {panel === "saved" && (
            <>
              <button className="hover:text-foreground transition-colors">All updates</button>
              <span>&bull;</span>
              <button className="hover:text-foreground transition-colors">Mentions</button>
            </>
          )}
          {panel === "index" && (
            <>
              <button
                className={cn("transition-colors", indexFilter === "alpha" ? "text-foreground" : "hover:text-foreground")}
                onClick={() => onIndexFilterChange("alpha")}
              >
                A-Z
              </button>
              <span>&bull;</span>
              <button
                className={cn("transition-colors", indexFilter === "recent" ? "text-foreground" : "hover:text-foreground")}
                onClick={() => onIndexFilterChange("recent")}
              >
                Recent
              </button>
              <span>&bull;</span>
              <button
                className={cn("transition-colors", indexFilter === "unlisted" ? "text-foreground" : "hover:text-foreground")}
                onClick={() => onIndexFilterChange("unlisted")}
              >
                Unlisted
              </button>
            </>
          )}
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
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent",
        disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}



