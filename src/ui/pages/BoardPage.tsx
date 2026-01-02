import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Eye, Filter, Plus, Tag, Users } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";

import { createTask, deleteTask, getWorkspace, listProfiles, listTasks, updateTask } from "../../data/api";
import type { Profile, Task } from "../../domain/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
import { cn } from "../lib/cn";
import { TaskDrawer } from "../components/TaskDrawer";
import { Modal } from "../components/Modal";
import { useQueryClient } from "@tanstack/react-query";
import { DISPLAY_KEY, loadDisplayPrefs, type DisplayPrefs } from "../state/displayPrefs";
import { useStubSession } from "../../auth/stubAuth";

function formatDueDate(date?: string) {
  if (!date) return null;
  return date;
}

function priorityVariant(p: Task["priority"]): "low" | "medium" | "high" | "critical" {
  return p;
}

export function BoardPage() {
  const { workspaceId = "demo" } = useParams();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { session } = useStubSession();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerMode, setDrawerMode] = React.useState<"create" | "edit">("create");
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [displayOpen, setDisplayOpen] = React.useState(false);
  const [display, setDisplay] = React.useState<DisplayPrefs>(() => loadDisplayPrefs());

  React.useEffect(() => {
    try {
      localStorage.setItem(DISPLAY_KEY, JSON.stringify(display));
    } catch {
      // ignore
    }
  }, [display]);

  const workspaceQ = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => getWorkspace(workspaceId)
  });

  const profilesQ = useQuery({
    queryKey: ["profiles", workspaceId],
    queryFn: () => listProfiles(workspaceId)
  });

  const tasksQ = useQuery({
    queryKey: ["tasks", workspaceId],
    queryFn: () => listTasks(workspaceId)
  });

  const workspaceName = workspaceQ.data?.name ?? "Workspace";
  const profiles = profilesQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) ?? null : null;

  const boardTasks = tasks.filter((t) => t.location === "board");

  // If routed here with a task id (e.g., clicked from Inbox panel), open it.
  React.useEffect(() => {
    const taskId = searchParams.get("task");
    if (!taskId) return;
    setDrawerMode("edit");
    setActiveTaskId(taskId);
    setDrawerOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const priority = (searchParams.get("priority") ?? "").trim().toLowerCase();
  const due = (searchParams.get("due") ?? "").trim().toLowerCase(); // "overdue" | "next7"

  const filteredTasks = boardTasks.filter((t) => {
    if (q.length) {
      const assigneeName = profiles.find((p) => p.id === t.assigneeId)?.name ?? "";
      const haystack = `${t.title} ${assigneeName} ${t.tags.join(" ")}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (priority.length && t.priority !== priority) return false;
    if (due.length) {
      if (!t.dueDate) return false;
      const today = new Date();
      const dueDate = new Date(`${t.dueDate}T00:00:00`);
      if (due === "overdue") {
        if (!(dueDate.getTime() < new Date(today.toDateString()).getTime())) return false;
      }
      if (due === "next7") {
        const start = new Date(today.toDateString()).getTime();
        const end = start + 7 * 24 * 60 * 60 * 1000;
        const d = dueDate.getTime();
        if (!(d >= start && d <= end)) return false;
      }
    }
    return true;
  });

  const byAssignee = profiles.map((p) => ({
    profile: p,
    tasks: filteredTasks.filter((t) => t.assigneeId === p.id)
  }));

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-slate-900">{workspaceName}</div>
          <div className="mt-1 text-sm text-slate-500">Team workspace / Project planning</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary">
            <Users size={16} className="text-slate-600" />
            Team Members
          </Button>
          <Button
            onClick={() => {
              setDrawerMode("create");
              setActiveTaskId(null);
              setDrawerOpen(true);
            }}
          >
            <Plus size={16} />
            Add New Task
          </Button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="w-full md:max-w-[520px]">
          <input
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            placeholder="Search tasks or assignees..."
            value={searchParams.get("q") ?? ""}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.value.trim().length) next.set("q", e.target.value);
              else next.delete("q");
              setSearchParams(next, { replace: true });
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm">
            <Tag size={16} className="text-slate-600" />
            Tags
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDisplayOpen(true)}>
            <Eye size={16} className="text-slate-600" />
            View
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              const cur = next.get("priority");
              // cycle: (unset) -> high -> critical -> (unset)
              if (!cur) next.set("priority", "high");
              else if (cur === "high") next.set("priority", "critical");
              else next.delete("priority");
              setSearchParams(next, { replace: true });
            }}
            title="Click to cycle priority filter"
          >
            <Filter size={16} className="text-slate-600" />
            Priority{priority ? `: ${priority}` : ""}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              const cur = next.get("due");
              // cycle: (unset) -> overdue -> next7 -> (unset)
              if (!cur) next.set("due", "overdue");
              else if (cur === "overdue") next.set("due", "next7");
              else next.delete("due");
              setSearchParams(next, { replace: true });
            }}
            title="Click to cycle due-date filter"
          >
            <Calendar size={16} className="text-slate-600" />
            Due{due ? `: ${due}` : ""}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {byAssignee.map(({ profile, tasks: personTasks }) => (
          <Card
            key={profile.id}
            className="p-4"
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              const taskId = e.dataTransfer.getData("text/plain");
              if (!taskId) return;
              await updateTask({ id: taskId, assigneeId: profile.id, location: "board" });
              await qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar name={profile.name} src={profile.avatarUrl} className="h-8 w-8 text-xs" />
                <div className="font-semibold text-slate-900">{profile.name}</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 font-medium text-slate-700">
                  {personTasks.length}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {personTasks.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onClick={() => {
                    setDrawerMode("edit");
                    setActiveTaskId(t.id);
                    setDrawerOpen(true);
                  }}
                  display={display}
                />
              ))}
              {personTasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  No tasks yet
                </div>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <TaskDrawer
        open={drawerOpen}
        mode={drawerMode}
        task={activeTask}
        profiles={profiles}
        onClose={() => {
          setDrawerOpen(false);
          if (searchParams.get("task")) {
            const next = new URLSearchParams(searchParams);
            next.delete("task");
            setSearchParams(next, { replace: true });
          }
        }}
        onSave={async (values) => {
          if (drawerMode === "create") {
            await createTask({
              workspaceId,
              createdBy: session.user.id,
              title: values.title,
              priority: values.priority,
              location: values.location,
              dueDate: values.dueDate ?? undefined,
              assigneeId: values.assigneeId
            });
            await qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
            setDrawerOpen(false);
            return;
          }

          if (activeTask) {
            await updateTask({
              id: activeTask.id,
              title: values.title,
              priority: values.priority,
              dueDate: values.dueDate ?? null,
              location: values.location,
              assigneeId: values.assigneeId
            });
            await qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
            setDrawerOpen(false);
          }
        }}
        onDelete={
          drawerMode === "edit" && activeTask
            ? () => {
                setConfirmDeleteOpen(true);
              }
            : undefined
        }
      />

      <Modal
        open={confirmDeleteOpen}
        title="Delete task?"
        description="This can’t be undone."
        onClose={() => setConfirmDeleteOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!activeTask) return;
                await deleteTask(activeTask.id);
                await qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
                setConfirmDeleteOpen(false);
                setDrawerOpen(false);
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        <div className="text-sm text-slate-700">
          You’re about to delete <span className="font-medium">{activeTask?.title}</span>.
        </div>
      </Modal>

      <Modal
        open={displayOpen}
        title="Display options"
        description="Control how dense task cards are across the board."
        onClose={() => setDisplayOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                setDisplay({
                  showPriority: true,
                  showDueDate: true,
                  showChecklist: true,
                  showComments: true
                })
              }
            >
              Reset
            </Button>
            <Button onClick={() => setDisplayOpen(false)}>Done</Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={display.showPriority}
              onChange={(e) => setDisplay((d) => ({ ...d, showPriority: e.target.checked }))}
            />
            Show priority
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={display.showDueDate}
              onChange={(e) => setDisplay((d) => ({ ...d, showDueDate: e.target.checked }))}
            />
            Show due date
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={display.showChecklist}
              onChange={(e) => setDisplay((d) => ({ ...d, showChecklist: e.target.checked }))}
            />
            Show subtasks progress
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={display.showComments}
              onChange={(e) => setDisplay((d) => ({ ...d, showComments: e.target.checked }))}
            />
            Show comments count
          </label>
        </div>
      </Modal>
    </div>
  );
}

function StatPill({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600",
        className
      )}
    >
      {children}
    </span>
  );
}

function TaskCard({
  task,
  onClick,
  display
}: {
  task: Task;
  onClick: () => void;
  display: DisplayPrefs;
}) {
  const due = formatDueDate(task.dueDate);

  return (
    <button
      className="w-full text-left rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-card transition-shadow"
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        // Allow ⌥-drag behaviors (browsers often flip to "copy" when Alt/Option is held).
        // We still treat this as a move in-app; ⌥ is used as a modifier (e.g. keep assignee).
        e.dataTransfer.effectAllowed = "copyMove";
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-slate-900 line-clamp-2">{task.title}</div>
        {display.showPriority ? (
          <Badge variant={priorityVariant(task.priority)} className="shrink-0">
            {task.priority === "critical"
              ? "Critical"
              : task.priority[0]!.toUpperCase() + task.priority.slice(1)}
          </Badge>
        ) : null}
      </div>

      {display.showDueDate || display.showChecklist || display.showComments ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {display.showDueDate && due ? <StatPill>📅 {due}</StatPill> : null}
          {display.showChecklist ? (
            <StatPill>
              ☑️ {task.checklist.done}/{task.checklist.total}
            </StatPill>
          ) : null}
          {display.showComments ? <StatPill>💬 {task.commentsCount}</StatPill> : null}
        </div>
      ) : null}
    </button>
  );
}


