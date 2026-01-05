import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Eye, Filter, Plus, Tag, Users } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";

import {
  createTask,
  createTaskPlacement,
  deleteTask,
  deleteTaskPlacementByTaskAndList,
  getWorkspace,
  listProfiles,
  listTaskGroups,
  listTaskLists,
  listTaskPlacements,
  listTasks,
  updateTask
} from "../../data/client";
import type { Profile, Task, TaskGroup, TaskList, TaskPlacement } from "../../domain/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { cn } from "../lib/cn";
import { TaskDrawer } from "../components/TaskDrawer";
import { Modal } from "../components/Modal";
import { useQueryClient } from "@tanstack/react-query";
import { DISPLAY_KEY, loadDisplayPrefs, type DisplayPrefs } from "../state/displayPrefs";
import { useStubSession } from "../../auth/stubAuth";

const DND_MIME = "application/x-nxtup-task";
type DragPayload = { taskId: string; fromListId?: string | null };

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
  const [quickAddText, setQuickAddText] = React.useState("");

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

  const groupsQ = useQuery({
    queryKey: ["taskGroups", workspaceId],
    queryFn: () => listTaskGroups(workspaceId)
  });

  const listsQ = useQuery({
    queryKey: ["taskLists", workspaceId],
    queryFn: () => listTaskLists(workspaceId)
  });

  const placementsQ = useQuery({
    queryKey: ["taskPlacements", workspaceId],
    queryFn: () => listTaskPlacements(workspaceId)
  });

  const workspaceName = workspaceQ.data?.name ?? "Workspace";
  const profiles = profilesQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const groups = groupsQ.data ?? [];
  const lists = listsQ.data ?? [];
  const placements = placementsQ.data ?? [];
  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) ?? null : null;

  const boardTasks = tasks.filter((t) => t.location === "board");

  const boardListIds = React.useMemo(() => new Set(lists.filter((l) => l.groupId).map((l) => l.id)), [lists]);
  const boardPlacements = React.useMemo(
    () => placements.filter((p) => boardListIds.has(p.listId)),
    [placements, boardListIds]
  );

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

  // Only show tasks that have at least one placement in any board list.
  const boardTaskIdSet = React.useMemo(
    () => new Set(boardPlacements.map((p) => p.taskId)),
    [boardPlacements]
  );

  const boardPlacedTasks = React.useMemo(
    () => boardTasks.filter((t) => boardTaskIdSet.has(t.id)),
    [boardTasks, boardTaskIdSet]
  );

  const filteredTasks = boardPlacedTasks.filter((t) => {
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

  const filteredTaskIdSet = React.useMemo(() => new Set(filteredTasks.map((t) => t.id)), [filteredTasks]);

  const tasksById = React.useMemo(() => {
    const m = new Map<string, Task>();
    for (const t of tasks) m.set(t.id, t);
    return m;
  }, [tasks]);

  const listsByGroup = React.useMemo(() => {
    const m = new Map<string, TaskList[]>();
    for (const l of lists) {
      if (!l.groupId) continue;
      const arr = m.get(l.groupId) ?? [];
      arr.push(l);
      m.set(l.groupId, arr);
    }
    for (const [gid, arr] of m) {
      m.set(
        gid,
        arr.slice().sort((a, b) => a.sortOrder - b.sortOrder)
      );
    }
    return m;
  }, [lists]);

  const placementsByList = React.useMemo(() => {
    const m = new Map<string, TaskPlacement[]>();
    for (const p of boardPlacements) {
      const arr = m.get(p.listId) ?? [];
      arr.push(p);
      m.set(p.listId, arr);
    }
    for (const [lid, arr] of m) {
      m.set(
        lid,
        arr.slice().sort((a, b) => a.position - b.position)
      );
    }
    return m;
  }, [boardPlacements]);

  const personListByProfileId = React.useMemo(() => {
    const m = new Map<string, TaskList>();
    for (const l of lists) {
      if (l.type !== "person") continue;
      const pid = l.refId;
      if (!pid) continue;
      m.set(pid, l);
    }
    return m;
  }, [lists]);

  const inboxList = React.useMemo(() => lists.find((l) => l.type === "inbox") ?? null, [lists]);

  const quickAddSuggestions = React.useMemo(() => {
    const raw = quickAddText.trim().toLowerCase();
    if (raw.length < 3) return [];
    return tasks
      .filter((t) => t.title.toLowerCase().includes(raw))
      .slice(0, 5);
  }, [quickAddText, tasks]);

  function parseAssigneeIdFromText(text: string): string | null {
    const at = text.match(/@([a-zA-Z][a-zA-Z0-9_-]*)/);
    const paren = text.match(/\(([^\)]+)\)/);
    const token = (at?.[1] ?? paren?.[1] ?? "").trim().toLowerCase();
    if (!token) return null;
    const match =
      profiles.find((p) => p.name.toLowerCase() === token) ??
      profiles.find((p) => p.name.toLowerCase().startsWith(token)) ??
      profiles.find((p) => p.name.toLowerCase().includes(token));
    return match?.id ?? null;
  }

  function stripAssigneeHints(text: string) {
    return text.replace(/@([a-zA-Z][a-zA-Z0-9_-]*)/g, "").replace(/\(([^\)]+)\)/g, "").trim();
  }

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
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
              <Filter size={14} className="text-slate-500" />
              Priority
            </div>
            <div className="w-[160px]">
              <Select
                value={searchParams.get("priority") ?? ""}
                onChange={(e) => {
                  const next = new URLSearchParams(searchParams);
                  const v = e.target.value;
                  if (v) next.set("priority", v);
                  else next.delete("priority");
                  setSearchParams(next, { replace: true });
                }}
              >
                <option value="">Any</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
              <Calendar size={14} className="text-slate-500" />
              Due
            </div>
            <div className="w-[170px]">
              <Select
                value={searchParams.get("due") ?? ""}
                onChange={(e) => {
                  const next = new URLSearchParams(searchParams);
                  const v = e.target.value;
                  if (v) next.set("due", v);
                  else next.delete("due");
                  setSearchParams(next, { replace: true });
                }}
              >
                <option value="">Any</option>
                <option value="overdue">Overdue</option>
                <option value="next7">Next 7 days</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="w-full md:max-w-[520px]">
          <Input
            placeholder='Quick add… (supports @name or "(Name)")'
            value={quickAddText}
            onChange={(e) => setQuickAddText(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key !== "Enter") return;
              const raw = quickAddText.trim();
              if (!raw.length) return;
              const assigneeId = parseAssigneeIdFromText(raw);
              const title = stripAssigneeHints(raw);
              const created = await createTask({
                workspaceId,
                createdBy: session.user.id,
                title,
                priority: "medium",
                location: "inbox",
                assigneeId
              });
              if (inboxList) {
                await createTaskPlacement({
                  workspaceId,
                  taskId: created.id,
                  listId: inboxList.id,
                  createdBy: session.user.id
                });
                await qc.invalidateQueries({ queryKey: ["taskPlacements", workspaceId] });
              }
              await qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
              setQuickAddText("");
            }}
          />
          {quickAddSuggestions.length ? (
            <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
              <div className="text-xs font-medium text-slate-600">Possible matches</div>
              <div className="mt-1 space-y-1">
                {quickAddSuggestions.map((t) => (
                  <button
                    key={t.id}
                    className="w-full rounded-md px-2 py-1 text-left text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setDrawerMode("edit");
                      setActiveTaskId(t.id);
                      setDrawerOpen(true);
                    }}
                  >
                    <div className="line-clamp-1">{t.title}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {groups
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((group) => {
            const groupLists = listsByGroup.get(group.id) ?? [];
            return (
              <section key={group.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{group.title}</div>
                    {group.description ? (
                      <div className="mt-1 text-sm text-slate-500">{group.description}</div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex gap-5 overflow-x-auto pb-2">
                  {groupLists.map((list) => {
                    const listPlacements = placementsByList.get(list.id) ?? [];
                    const listTasks = listPlacements
                      .map((p) => tasksById.get(p.taskId))
                      .filter((t): t is Task => t != null && filteredTaskIdSet.has(t.id));
                    const count = listTasks.length;

                    const person =
                      list.type === "person" && list.refId ? profiles.find((p) => p.id === list.refId) ?? null : null;

                    return (
                      <Card
                        key={list.id}
                        className="w-[320px] shrink-0 p-4"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={async (e) => {
                          const raw = e.dataTransfer.getData(DND_MIME);
                          const payload: DragPayload | null = raw ? JSON.parse(raw) : null;
                          const taskId = payload?.taskId ?? e.dataTransfer.getData("text/plain");
                          if (!taskId) return;

                          // Default is MOVE: remove the placement from the source list unless ⌥ is held (COPY).
                          if (!e.altKey && payload?.fromListId && payload.fromListId !== list.id) {
                            await deleteTaskPlacementByTaskAndList({
                              workspaceId,
                              taskId,
                              listId: payload.fromListId
                            });
                          }
                          // Ensure the task is placed in this list (multi-placement allowed).
                          await createTaskPlacement({
                            workspaceId,
                            taskId,
                            listId: list.id,
                            createdBy: session.user.id
                          });
                          // Maintain legacy task semantics for now.
                          if (list.type === "person" && person) {
                            await updateTask({ id: taskId, assigneeId: person.id, location: "board" });
                          } else {
                            await updateTask({ id: taskId, location: "board" });
                          }
                          await qc.invalidateQueries({ queryKey: ["taskPlacements", workspaceId] });
                          await qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {person ? (
                              <Avatar name={person.name} src={person.avatarUrl} className="h-8 w-8 text-xs" />
                            ) : (
                              <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                                {list.type === "project" ? "P" : list.type === "time_slot" ? "T" : "L"}
                              </div>
                            )}
                            <div className="font-semibold text-slate-900">{person ? person.name : list.title}</div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 font-medium text-slate-700">
                              {count}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          {listTasks.map((t) => (
                            <TaskCard
                              key={t.id}
                              task={t}
                              fromListId={list.id}
                              onClick={() => {
                                setDrawerMode("edit");
                                setActiveTaskId(t.id);
                                setDrawerOpen(true);
                              }}
                              display={display}
                            />
                          ))}
                          {count === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                              No tasks yet
                            </div>
                          ) : null}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
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
            const created = await createTask({
              workspaceId,
              createdBy: session.user.id,
              title: values.title,
              priority: values.priority,
              location: values.location,
              dueDate: values.dueDate ?? undefined,
              assigneeId: values.assigneeId
            });
            // If created directly onto the board, ensure it has at least one placement so it renders.
            if (created.location === "board") {
              const list =
                (created.assigneeId ? personListByProfileId.get(created.assigneeId) : null) ??
                lists.find((l) => l.groupId && l.type === "person") ??
                null;
              if (list) {
                await createTaskPlacement({
                  workspaceId,
                  taskId: created.id,
                  listId: list.id,
                  createdBy: session.user.id
                });
                await qc.invalidateQueries({ queryKey: ["taskPlacements", workspaceId] });
              }
            }
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
  fromListId,
  onClick,
  display
}: {
  task: Task;
  fromListId: string;
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
        e.dataTransfer.setData(DND_MIME, JSON.stringify({ taskId: task.id, fromListId } satisfies DragPayload));
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


