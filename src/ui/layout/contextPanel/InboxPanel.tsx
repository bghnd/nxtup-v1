import React from "react";
import { Inbox } from "lucide-react";

import type { Task } from "../../../domain/types";
import type { DisplayPrefs } from "../../state/displayPrefs";
import { cn } from "../../lib/cn";
import { Badge } from "../../components/Badge";

const DND_MIME = "application/x-nxtup-task";

export function InboxPanel({
  count,
  tasks,
  display,
  onOpenTask,
  onDropTaskToInbox
}: {
  count: number;
  tasks: Task[];
  display: DisplayPrefs;
  onOpenTask: (taskId: string) => void;
  onDropTaskToInbox: (taskId: string, opts: { keepAssignee: boolean }) => void;
}) {
  const [isOver, setIsOver] = React.useState(false);
  const dragDepth = React.useRef(0);

  return (
    <div
      className="p-4 min-h-full"
      onDragOver={(e) => {
        e.preventDefault();
        // Make ⌥-drag feel intentional (shows "copy" cursor in many browsers).
        e.dataTransfer.dropEffect = e.altKey ? "copy" : "move";
      }}
      onDragEnter={() => {
        dragDepth.current += 1;
        setIsOver(true);
      }}
      onDragLeave={() => {
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) {
          dragDepth.current = 0;
          setIsOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData("text/plain");
        if (!taskId) return;
        dragDepth.current = 0;
        setIsOver(false);
        onDropTaskToInbox(taskId, { keepAssignee: e.altKey });
      }}
    >
      <div className="flex items-center gap-2">
        <Inbox size={18} className="text-slate-600" />
        <div className="text-sm font-semibold text-slate-900">Inbox</div>
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-medium text-slate-700">
          {count}
        </span>
      </div>

      <div
        className={cn(
          "mt-4 rounded-xl border border-slate-200 bg-white p-3 transition-colors",
          isOver && "bg-blue-50/40 ring-2 ring-blue-500/20 ring-inset"
        )}
      >
        {tasks.length ? (
          <div className="space-y-3">
            {tasks.map((t) => (
              <InboxTaskCard key={t.id} task={t} display={display} onOpen={() => onOpenTask(t.id)} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
            <div className="text-sm font-medium text-slate-900">Inbox is empty</div>
            <div className="mt-1 text-sm text-slate-500">
              New tasks can start here before being assigned to a teammate.
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Tip: drop a task here to move it back to Inbox. Hold{" "}
              <kbd className="rounded border px-1">⌥</kbd> to keep the assignee.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InboxTaskCard({
  task,
  display,
  onOpen
}: {
  task: Task;
  display: DisplayPrefs;
  onOpen: () => void;
}) {
  const due = task.dueDate ?? null;
  return (
    <button
      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:shadow-card transition-shadow"
      onClick={onOpen}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        // Source list for inbox tasks is the inbox list; this enables MOVE vs ⌥-COPY semantics.
        e.dataTransfer.setData(DND_MIME, JSON.stringify({ taskId: task.id, fromListId: "l_inbox" }));
        // Allow ⌥-drag behaviors (browsers often flip to "copy" when Alt/Option is held).
        // We still treat this as a move in-app; ⌥ is used as a modifier (e.g. keep assignee).
        e.dataTransfer.effectAllowed = "copyMove";
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-slate-900 line-clamp-2">{task.title}</div>
        {display.showPriority ? (
          <Badge variant={task.priority} className="shrink-0">
            {task.priority === "critical"
              ? "Critical"
              : task.priority[0]!.toUpperCase() + task.priority.slice(1)}
          </Badge>
        ) : null}
      </div>

      {display.showDueDate && due ? (
        <div className={cn("mt-3")}>
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
            📅 {due}
          </span>
        </div>
      ) : null}
    </button>
  );
}



