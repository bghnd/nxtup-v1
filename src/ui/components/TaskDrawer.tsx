import React from "react";
import type { Priority, Profile, Task, TaskLocation } from "../../domain/types";
import { cn } from "../lib/cn";
import { Button } from "./Button";
import { Input } from "./Input";
import { Select } from "./Select";

export type TaskDrawerMode = "create" | "edit";

export function TaskDrawer({
  open,
  mode,
  task,
  profiles,
  onClose,
  onSave,
  onDelete
}: {
  open: boolean;
  mode: TaskDrawerMode;
  task?: Task | null;
  profiles: Profile[];
  onClose: () => void;
  onSave: (values: {
    title: string;
    priority: Priority;
    dueDate?: string | null;
    location: TaskLocation;
    assigneeId: string | null;
  }) => void;
  onDelete?: () => void;
}) {
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (!open) return;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const [title, setTitle] = React.useState("");
  const [priority, setPriority] = React.useState<Priority>("medium");
  const [dueDate, setDueDate] = React.useState<string>("");
  const [location, setLocation] = React.useState<TaskLocation>("inbox");
  const [assigneeId, setAssigneeId] = React.useState<string>(""); // empty == unassigned

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && task) {
      setTitle(task.title);
      setPriority(task.priority);
      setDueDate(task.dueDate ?? "");
      setLocation(task.location);
      setAssigneeId(task.assigneeId ?? "");
      return;
    }

    // create defaults
    setTitle("");
    setPriority("medium");
    setDueDate("");
    setLocation("inbox");
    setAssigneeId("");
  }, [open, mode, task, profiles]);

  if (!open) return null;

  const canSave =
    title.trim().length > 0 &&
    (location === "inbox" ? true : assigneeId.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-slate-900/25"
        aria-label="Close task drawer"
        onClick={onClose}
      />

      <div className="absolute right-0 top-0 h-full w-[min(520px,calc(100vw-2rem))]">
        <div className="flex h-full flex-col border-l border-slate-200 bg-white shadow-card">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
            <div>
              <div className="text-lg font-semibold text-slate-900">
                {mode === "create" ? "New Task" : "Task Details"}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {mode === "create"
                  ? "Create a task and assign it to a teammate."
                  : "Edit the task fields and save."}
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-5">
            <div className="space-y-4">
              <Field label="Title">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>

              <Field label="Location">
                <Select value={location} onChange={(e) => setLocation(e.target.value as TaskLocation)}>
                  <option value="inbox">Inbox</option>
                  <option value="board">Board</option>
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Priority">
                  <Select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </Select>
                </Field>

                <Field label="Due date">
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Assignee">
                <Select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  disabled={location === "inbox" ? false : false}
                >
                  <option value="">Unassigned</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          <div className="border-t border-slate-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                {mode === "edit" && onDelete ? (
                  <Button variant="ghost" className="text-rose-700 hover:bg-rose-50" onClick={onDelete}>
                    Delete
                  </Button>
                ) : (
                  <span className="text-xs text-slate-500">
                    Tip: press <kbd className="rounded border px-1">Esc</kbd> to close
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  disabled={!canSave}
                  onClick={() =>
                    onSave({
                      title: title.trim(),
                      priority,
                      dueDate: dueDate.length ? dueDate : null,
                      location,
                      assigneeId: assigneeId.length ? assigneeId : null
                    })
                  }
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>
      <div className={cn("w-full")}>{children}</div>
    </label>
  );
}



