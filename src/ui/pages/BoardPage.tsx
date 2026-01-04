import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Eye, Filter, MoreHorizontal, Plus, Tag, Users } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import {
  createTaskGroup,
  createTaskList,
  createMemberPlaceholder,
  createInvite,
  createTask,
  createTaskPlacement,
  createWorkspace,
  deleteTask,
  deleteTaskGroup,
  deleteTaskList,
  deleteTaskPlacementByTaskAndList,
  deleteWorkspace,
  getWorkspace,
  listProfiles,
  listWorkspaces,
  listTaskGroups,
  listTaskLists,
  listTaskPlacements,
  listTasks,
  listTaskParticipants,
  removeTaskParticipant,
  upsertTaskParticipant,
  updateWorkspace,
  updateTaskGroup,
  updateTaskList,
  updateTask
} from "../../data/client";
import type { Profile, Task, TaskGroup, TaskList, TaskPlacement } from "../../domain/types";
import type { TaskParticipant } from "../../domain/types";
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
  const nav = useNavigate();
  const { session } = useStubSession();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerMode, setDrawerMode] = React.useState<"create" | "edit">("create");
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [displayOpen, setDisplayOpen] = React.useState(false);
  const [display, setDisplay] = React.useState<DisplayPrefs>(() => loadDisplayPrefs());
  const [quickAddText, setQuickAddText] = React.useState("");
  const [quickAddActiveIdx, setQuickAddActiveIdx] = React.useState(0);

  // Workspace / group / list management modals
  const [workspaceModal, setWorkspaceModal] = React.useState<
    | null
    | { mode: "create" }
    | { mode: "rename"; id: string; name: string }
    | { mode: "delete"; id: string; name: string }
  >(null);
  const [workspaceNameDraft, setWorkspaceNameDraft] = React.useState("");

  const [groupModal, setGroupModal] = React.useState<
    | null
    | { mode: "create" }
    | { mode: "rename"; id: string; title: string; description: string | null }
    | { mode: "delete"; id: string; title: string }
  >(null);
  const [groupTitleDraft, setGroupTitleDraft] = React.useState("");
  const [groupDescDraft, setGroupDescDraft] = React.useState("");

  const [listModal, setListModal] = React.useState<
    | null
    | { mode: "create"; groupId: string | null }
    | { mode: "rename"; id: string; title: string }
    | { mode: "delete"; id: string; title: string }
  >(null);
  const [listTitleDraft, setListTitleDraft] = React.useState("");
  const [listTypeDraft, setListTypeDraft] = React.useState<TaskList["type"]>("other");

  const [unknownMemberModal, setUnknownMemberModal] = React.useState<
    | null
    | {
        taskPart: string;
        op: null | "move" | "add";
        listPart: string | null;
        kind: "owner" | "watcher";
        token: string;
        ownerId: string | null;
        watcherIds: string[];
      }
  >(null);
  const [unknownMemberNameDraft, setUnknownMemberNameDraft] = React.useState("");
  const [unknownMemberEmailDraft, setUnknownMemberEmailDraft] = React.useState("");
  const [unknownMemberSendInvite, setUnknownMemberSendInvite] = React.useState(false);

  React.useEffect(() => {
    if (!workspaceModal) return;
    if (workspaceModal.mode === "create") {
      setWorkspaceNameDraft("");
    } else {
      setWorkspaceNameDraft(workspaceModal.name);
    }
  }, [workspaceModal]);

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

  const workspacesQ = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => listWorkspaces()
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

  const participantsQ = useQuery({
    queryKey: ["taskParticipants", workspaceId],
    queryFn: () => listTaskParticipants(workspaceId)
  });

  const workspaceName = workspaceQ.data?.name ?? "Workspace";
  const workspaces = workspacesQ.data ?? [];
  const profiles = profilesQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const groups = groupsQ.data ?? [];
  const lists = listsQ.data ?? [];
  const placements = placementsQ.data ?? [];
  const participants = participantsQ.data ?? [];
  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) ?? null : null;
  const activeParticipants = React.useMemo(() => {
    if (!activeTask) return [];
    return participants.filter((p) => p.taskId === activeTask.id);
  }, [participants, activeTask]);

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

  function closeTaskDrawer() {
    setDrawerOpen(false);
    setActiveTaskId(null);
    if (searchParams.get("task")) {
      const next = new URLSearchParams(searchParams);
      next.delete("task");
      setSearchParams(next, { replace: true });
    }
  }

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

  const quickEntry = React.useMemo(() => parseQuickEntry(quickAddText), [quickAddText]);

  const quickAddSuggestions = React.useMemo(() => {
    const raw = stripPeopleHints(quickEntry.taskPart).trim().toLowerCase();
    if (raw.length < 3) return [];
    return tasks
      .filter((t) => t.title.toLowerCase().includes(raw))
      .slice(0, 5);
  }, [quickEntry.taskPart, tasks]);

  React.useEffect(() => {
    // When suggestions change, snap the active selection back to the top.
    setQuickAddActiveIdx(0);
  }, [quickAddSuggestions.length, quickAddText]);

  function findProfileIdByToken(token: string): string | null {
    const t = token.trim().toLowerCase();
    if (!t) return null;
    const match =
      profiles.find((p) => p.name.toLowerCase() === t) ??
      profiles.find((p) => p.name.toLowerCase().startsWith(t)) ??
      profiles.find((p) => p.name.toLowerCase().includes(t));
    return match?.id ?? null;
  }

  function extractOwnerToken(text: string): string | null {
    const at = text.match(/@([a-zA-Z][a-zA-Z0-9_-]*)/);
    return at?.[1] ? at[1].trim() : null;
  }

  function extractWatcherTokens(text: string): string[] {
    const tokens: string[] = [];
    const matches = text.matchAll(/\(([^\)]+)\)/g);
    for (const m of matches) {
      const raw = (m[1] ?? "").trim();
      if (!raw.length) continue;
      // Support "(Bob, Charlie)" style.
      for (const part of raw.split(",")) {
        const t = part.trim();
        if (t.length) tokens.push(t);
      }
    }
    return tokens;
  }

  function parseOwnerIdFromText(text: string): string | null {
    const token = extractOwnerToken(text);
    if (!token) return null;
    return findProfileIdByToken(token);
  }

  function parseWatcherIdsFromText(text: string): string[] {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const token of extractWatcherTokens(text)) {
      const id = findProfileIdByToken(token);
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    return ids;
  }

  function firstUnknownToken(text: string): { kind: "owner" | "watcher"; token: string } | null {
    const ownerToken = extractOwnerToken(text);
    if (ownerToken && !findProfileIdByToken(ownerToken)) return { kind: "owner", token: ownerToken };
    for (const w of extractWatcherTokens(text)) {
      if (!findProfileIdByToken(w)) return { kind: "watcher", token: w };
    }
    return null;
  }

  function stripPeopleHints(text: string) {
    return text.replace(/@([a-zA-Z][a-zA-Z0-9_-]*)/g, "").replace(/\(([^\)]+)\)/g, "").trim();
  }

  async function quickCreateTaskFromEntry(input: {
    taskPart: string;
    ownerId: string | null;
    watcherIds: string[];
    titleMode: "strip" | "raw";
    op: null | "move" | "add";
    listPart: string | null;
  }) {
    const title = input.titleMode === "strip" ? stripPeopleHints(input.taskPart) : input.taskPart.trim();
    const created = await createTask({
      workspaceId,
      createdBy: session.user.id,
      title,
      priority: "medium",
      location: "inbox",
      assigneeId: input.ownerId
    });

    const target = input.op ? findListFromText(input.listPart ?? "") : null;
    const placementList = target ?? inboxList;
    if (placementList) {
      await createTaskPlacement({
        workspaceId,
        taskId: created.id,
        listId: placementList.id,
        createdBy: session.user.id
      });
      // Normalize task fields if the user created directly into a board list.
      if (placementList.type !== "inbox") {
        await updateTask({
          id: created.id,
          location: "board",
          assigneeId: placementList.type === "person" ? (placementList.refId ?? input.ownerId) : input.ownerId
        });
      }
      await qc.invalidateQueries({ queryKey: ["taskPlacements", workspaceId] });
    }

    if (input.watcherIds.length) {
      await Promise.all(
        input.watcherIds.map((profileId) =>
          upsertTaskParticipant({
            workspaceId,
            taskId: created.id,
            profileId,
            role: "watcher",
            createdBy: session.user.id
          })
        )
      );
      await qc.invalidateQueries({ queryKey: ["taskParticipants", workspaceId] });
    }

    await qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    setQuickAddText("");
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    setSearchParams(next, { replace: true });
  }

  function parseQuickEntry(text: string): {
    taskPart: string;
    op: null | "move" | "add";
    listPart: string | null;
  } {
    const m = text.match(/(\+->|->)\s*([^\n]+)$/);
    if (!m?.[0] || m.index == null) return { taskPart: text, op: null, listPart: null };
    const op = m[1] === "+->" ? "add" : "move";
    const listPart = (m[2] ?? "").trim();
    const taskPart = text.slice(0, m.index).trim();
    return { taskPart, op, listPart };
  }

  function findListFromText(text: string): TaskList | null {
    const raw = text.trim().toLowerCase();
    if (!raw.length) return null;
    if (raw === "inbox" || raw === "@inbox") return inboxList;

    // Allow targeting person lists by "@Name" as well as plain "Name".
    const at = raw.startsWith("@") ? raw.slice(1).trim() : raw;
    const profileMatch =
      profiles.find((p) => p.name.toLowerCase() === at) ??
      profiles.find((p) => p.name.toLowerCase().startsWith(at)) ??
      profiles.find((p) => p.name.toLowerCase().includes(at));
    if (profileMatch) {
      const personList = personListByProfileId.get(profileMatch.id) ?? null;
      if (personList) return personList;
    }

    // Fallback: match list titles.
    return (
      lists.find((l) => l.title.toLowerCase() === raw) ??
      lists.find((l) => l.title.toLowerCase().startsWith(raw)) ??
      lists.find((l) => l.title.toLowerCase().includes(raw)) ??
      null
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-semibold text-slate-900">{workspaceName}</div>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Workspace menu"
              title="Workspace actions"
              onClick={() => setWorkspaceModal({ mode: "rename", id: workspaceId, name: workspaceName })}
            >
              <MoreHorizontal size={18} />
            </Button>
          </div>
          <div className="mt-1 text-sm text-slate-500">Team workspace / Project planning</div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select
              className="h-9 w-[260px]"
              value={workspaceId}
              onChange={(e) => {
                const id = e.target.value;
                nav(`/w/${id}/board`);
              }}
              title="Switch workspace"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setWorkspaceNameDraft("");
                setWorkspaceModal({ mode: "create" });
              }}
            >
              <Plus size={16} className="text-slate-600" />
              New workspace
            </Button>
          </div>
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
            placeholder='Search or add… (Enter opens • ⌘↵ creates • "->" moves • "+->" multi-places)'
            value={quickAddText}
            onChange={(e) => {
              const v = e.target.value;
              setQuickAddText(v);
              setQuickAddActiveIdx(0);
              // Use the same input as the board search query (single source of truth).
              const parsed = parseQuickEntry(v);
              const q = stripPeopleHints(parsed.taskPart).trim();
              const next = new URLSearchParams(searchParams);
              if (q.length) next.set("q", q);
              else next.delete("q");
              setSearchParams(next, { replace: true });
            }}
            onKeyDown={async (e) => {
              // Keyboard navigation through suggestions (wrap-around).
              if (e.key === "ArrowDown" && quickAddSuggestions.length) {
                e.preventDefault();
                setQuickAddActiveIdx((idx) => (idx + 1) % quickAddSuggestions.length);
                return;
              }
              if (e.key === "ArrowUp" && quickAddSuggestions.length) {
                e.preventDefault();
                setQuickAddActiveIdx((idx) =>
                  (idx - 1 + quickAddSuggestions.length) % quickAddSuggestions.length
                );
                return;
              }
              if (e.key === "Escape") {
                // Dismiss the picker quickly.
                e.preventDefault();
                setQuickAddText("");
                setQuickAddActiveIdx(0);
                const next = new URLSearchParams(searchParams);
                next.delete("q");
                setSearchParams(next, { replace: true });
                return;
              }
              if (e.key !== "Enter") return;
              e.preventDefault();
              const raw = quickAddText.trim();
              if (!raw.length) return;
              const forceCreate = e.metaKey || e.ctrlKey;
              try {
                const parsed = parseQuickEntry(raw);
                const targetList = parsed.op ? findListFromText(parsed.listPart ?? "") : null;

                // Command: move / multi-place an existing task (when a target list is specified).
                if (parsed.op && targetList && quickAddSuggestions.length && !forceCreate) {
                  const selected =
                    quickAddSuggestions[
                      Math.max(0, Math.min(quickAddActiveIdx, quickAddSuggestions.length - 1))
                    ];
                  if (!selected) return;

                  await createTaskPlacement({
                    workspaceId,
                    taskId: selected.id,
                    listId: targetList.id,
                    createdBy: session.user.id
                  });

                  if (parsed.op === "move") {
                    const ps = placements.filter((p) => p.taskId === selected.id);
                    const inboxId = inboxList?.id ?? null;
                    const nonInbox = ps.filter((p) => p.listId !== inboxId);

                    // Always remove Inbox placement when moving to a board list.
                    if (inboxId && targetList.id !== inboxId && ps.some((p) => p.listId === inboxId)) {
                      await deleteTaskPlacementByTaskAndList({
                        workspaceId,
                        taskId: selected.id,
                        listId: inboxId
                      });
                    }

                    // If there is exactly one non-inbox placement, treat it as the source and remove it.
                    const singleNonInbox = nonInbox.length === 1 ? nonInbox[0]! : null;
                    if (singleNonInbox && singleNonInbox.listId !== targetList.id) {
                      await deleteTaskPlacementByTaskAndList({
                        workspaceId,
                        taskId: selected.id,
                        listId: singleNonInbox.listId
                      });
                    }
                  }

                  // Keep canonical task fields consistent with list semantics.
                  if (targetList.type === "inbox") {
                    await updateTask({
                      id: selected.id,
                      location: "inbox",
                      assigneeId: parsed.op === "move" ? null : selected.assigneeId ?? null
                    });
                  } else {
                    const nextAssigneeId =
                      targetList.type === "person" ? (targetList.refId ?? null) : selected.assigneeId ?? null;
                    await updateTask({
                      id: selected.id,
                      location: "board",
                      assigneeId: nextAssigneeId
                    });
                  }

                  await qc.invalidateQueries({ queryKey: ["taskPlacements", workspaceId] });
                  await qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
                  setQuickAddText("");
                  const next = new URLSearchParams(searchParams);
                  next.delete("q");
                  setSearchParams(next, { replace: true });
                  return;
                }

                // Search-first: if there are matches and the user didn't force-create, open the top match.
                if (!forceCreate && quickAddSuggestions.length) {
                  const selected =
                    quickAddSuggestions[
                      Math.max(0, Math.min(quickAddActiveIdx, quickAddSuggestions.length - 1))
                    ];
                  if (selected) {
                    setDrawerMode("edit");
                    setActiveTaskId(selected.id);
                    setDrawerOpen(true);
                    return;
                  }
                }
                const taskPart = parsed.op ? parsed.taskPart : raw;
                const ownerId = parseOwnerIdFromText(taskPart);
                const watcherIds = parseWatcherIdsFromText(taskPart);
                const unknown = firstUnknownToken(taskPart);
                if (unknown) {
                  setUnknownMemberNameDraft(unknown.token);
                  setUnknownMemberEmailDraft("");
                  setUnknownMemberSendInvite(false);
                  setUnknownMemberModal({
                    taskPart,
                    op: parsed.op,
                    listPart: parsed.listPart ?? null,
                    kind: unknown.kind,
                    token: unknown.token,
                    ownerId,
                    watcherIds
                  });
                  return;
                }

                await quickCreateTaskFromEntry({
                  taskPart,
                  ownerId,
                  watcherIds,
                  titleMode: "strip",
                  op: parsed.op,
                  listPart: parsed.listPart ?? null
                });
              } catch (err) {
                // eslint-disable-next-line no-console
                console.error("[QuickAdd] create failed", err);
              }
            }}
          />
          {quickAddSuggestions.length ? (
            <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
              <div className="text-xs font-medium text-slate-600">Possible matches</div>
              <div className="mt-1 text-xs text-slate-500">
                Press <span className="font-medium">Enter</span> to open the top match. Press{" "}
                <span className="font-medium">⌘↵</span> to create anyway.
              </div>
              <div className="mt-1 space-y-1">
                {quickAddSuggestions.map((t, idx) => (
                  <button
                    key={t.id}
                    className={cn(
                      "w-full rounded-md px-2 py-1 text-left text-sm text-slate-700 hover:bg-slate-50",
                      idx === quickAddActiveIdx && "bg-blue-50 ring-1 ring-blue-500/20"
                    )}
                    onClick={() => {
                      setDrawerMode("edit");
                      setActiveTaskId(t.id);
                      setDrawerOpen(true);
                    }}
                    onMouseEnter={() => setQuickAddActiveIdx(idx)}
                    aria-selected={idx === quickAddActiveIdx}
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
        <div className="flex items-center justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setGroupTitleDraft("");
              setGroupDescDraft("");
              setGroupModal({ mode: "create" });
            }}
          >
            <Plus size={16} className="text-slate-600" />
            Add group
          </Button>
        </div>
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setListTitleDraft("");
                        setListTypeDraft("other");
                        setListModal({ mode: "create", groupId: group.id });
                      }}
                    >
                      <Plus size={16} className="text-slate-600" />
                      Add list
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Group actions"
                      title="Rename or delete group"
                      onClick={() => {
                        setGroupTitleDraft(group.title);
                        setGroupDescDraft(group.description ?? "");
                        setGroupModal({
                          mode: "rename",
                          id: group.id,
                          title: group.title,
                          description: group.description ?? null
                        });
                      }}
                    >
                      <MoreHorizontal size={18} />
                    </Button>
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
                          e.preventDefault();
                          const raw = e.dataTransfer.getData(DND_MIME);
                          const payload: DragPayload | null = raw ? JSON.parse(raw) : null;
                          const taskId = payload?.taskId ?? e.dataTransfer.getData("text/plain");
                          if (!taskId) return;

                          try {
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
                          } catch (err) {
                            // eslint-disable-next-line no-console
                            console.error("[DnD] drop failed", err);
                          }
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
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="List actions"
                              title="Rename or delete list"
                              onClick={() => {
                                setListTitleDraft(list.title);
                                setListModal({ mode: "rename", id: list.id, title: list.title });
                              }}
                            >
                              <MoreHorizontal size={18} />
                            </Button>
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
        participants={activeParticipants as TaskParticipant[]}
        onAddMember={async (input) => {
          const profile = await createMemberPlaceholder({
            workspaceId,
            name: input.name,
            email: input.email ?? null,
            status: input.sendInvite ? "invited" : "active",
            role: "member"
          });
          if (input.sendInvite && input.email && input.email.trim().length) {
            await createInvite({
              workspaceId,
              email: input.email.trim(),
              role: "member",
              createdBy: session.user.id as any
            });
          }
          await qc.invalidateQueries({ queryKey: ["profiles", workspaceId] });
          return profile;
        }}
        onClose={closeTaskDrawer}
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
            if (values.watcherIds.length) {
              await Promise.all(
                values.watcherIds.map((profileId) =>
                  upsertTaskParticipant({
                    workspaceId,
                    taskId: created.id,
                    profileId,
                    role: "watcher",
                    createdBy: session.user.id
                  })
                )
              );
              await qc.invalidateQueries({ queryKey: ["taskParticipants", workspaceId] });
            }
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
            closeTaskDrawer();
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
            // Apply watcher diffs on save (Cancel should discard local edits).
            const prevWatcherIds = new Set(
              (activeParticipants ?? []).filter((p) => p.role === "watcher").map((p) => p.profileId)
            );
            const nextWatcherIds = new Set(values.watcherIds);
            const toAdd = Array.from(nextWatcherIds).filter((id) => !prevWatcherIds.has(id));
            const toRemove = Array.from(prevWatcherIds).filter((id) => !nextWatcherIds.has(id));
            if (toAdd.length || toRemove.length) {
              await Promise.all([
                ...toAdd.map((profileId) =>
                  upsertTaskParticipant({
                    workspaceId,
                    taskId: activeTask.id,
                    profileId,
                    role: "watcher",
                    createdBy: session.user.id
                  })
                ),
                ...toRemove.map((profileId) =>
                  removeTaskParticipant({
                    workspaceId,
                    taskId: activeTask.id,
                    profileId
                  })
                )
              ]);
              await qc.invalidateQueries({ queryKey: ["taskParticipants", workspaceId] });
            }
            await qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
            closeTaskDrawer();
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
                closeTaskDrawer();
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

      {/* Workspace management */}
      <Modal
        open={Boolean(workspaceModal)}
        title={
          workspaceModal?.mode === "create"
            ? "New workspace"
            : workspaceModal?.mode === "delete"
              ? "Delete workspace"
              : "Rename workspace"
        }
        onClose={() => setWorkspaceModal(null)}
        footer={
          workspaceModal ? (
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setWorkspaceModal(null)}>
                Cancel
              </Button>
              {workspaceModal.mode === "delete" ? (
                <Button
                  className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800"
                  onClick={async () => {
                    await deleteWorkspace({ id: workspaceModal.id as any });
                    await qc.invalidateQueries({ queryKey: ["workspaces"] });
                    // If you deleted the active workspace, go to demo (or first available).
                    nav("/w/demo/board");
                    setWorkspaceModal(null);
                  }}
                >
                  Delete
                </Button>
              ) : (
                <Button
                  onClick={async () => {
                    const name =
                      (workspaceModal.mode === "create" ? workspaceNameDraft : workspaceNameDraft || workspaceModal.name)
                        .trim() || "Workspace";
                    if (workspaceModal.mode === "create") {
                      const ws = await createWorkspace({ name });
                      await qc.invalidateQueries({ queryKey: ["workspaces"] });
                      nav(`/w/${ws.id}/board`);
                      setWorkspaceModal(null);
                      return;
                    }
                    const ws = await updateWorkspace({ id: workspaceModal.id as any, name });
                    await qc.invalidateQueries({ queryKey: ["workspaces"] });
                    await qc.invalidateQueries({ queryKey: ["workspace", ws.id] });
                    setWorkspaceModal(null);
                  }}
                  disabled={
                    workspaceModal.mode === "create"
                      ? !workspaceNameDraft.trim().length
                      : !(workspaceNameDraft || workspaceModal.name).trim().length
                  }
                >
                  Save
                </Button>
              )}
            </div>
          ) : null
        }
      >
        {workspaceModal?.mode === "delete" ? (
          <div className="text-sm text-slate-700">
            This will delete <span className="font-medium">{workspaceModal.name}</span> and all of its data (groups, lists,
            tasks, placements).
          </div>
        ) : (
          <div>
            <div className="text-xs font-medium text-slate-600">Name</div>
            <Input
              className="mt-2"
              autoFocus
              value={workspaceNameDraft}
              onChange={(e) => setWorkspaceNameDraft(e.target.value)}
              placeholder="Workspace name"
            />
            {workspaceModal?.mode === "rename" ? (
              <div className="mt-3 text-xs text-slate-500">
                Want to delete instead?{" "}
                <button
                  className="text-rose-700 hover:underline"
                  onClick={() =>
                    setWorkspaceModal({ mode: "delete", id: workspaceModal.id, name: workspaceModal.name })
                  }
                >
                  Delete workspace
                </button>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      {/* Group management */}
      <Modal
        open={Boolean(groupModal)}
        title={
          groupModal?.mode === "create" ? "New group" : groupModal?.mode === "delete" ? "Delete group" : "Edit group"
        }
        onClose={() => setGroupModal(null)}
        footer={
          groupModal ? (
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setGroupModal(null)}>
                Cancel
              </Button>
              {groupModal.mode === "delete" ? (
                <Button
                  className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800"
                  onClick={async () => {
                    await deleteTaskGroup({ id: groupModal.id });
                    await qc.invalidateQueries({ queryKey: ["taskGroups", workspaceId] });
                    await qc.invalidateQueries({ queryKey: ["taskLists", workspaceId] });
                    setGroupModal(null);
                  }}
                >
                  Delete
                </Button>
              ) : (
                <Button
                  onClick={async () => {
                    const title = groupTitleDraft.trim();
                    const description = groupDescDraft.trim().length ? groupDescDraft.trim() : null;
                    if (groupModal.mode === "create") {
                      await createTaskGroup({ workspaceId, title, description });
                    } else {
                      await updateTaskGroup({ id: groupModal.id, title, description });
                    }
                    await qc.invalidateQueries({ queryKey: ["taskGroups", workspaceId] });
                    setGroupModal(null);
                  }}
                  disabled={!groupTitleDraft.trim().length}
                >
                  Save
                </Button>
              )}
            </div>
          ) : null
        }
      >
        {groupModal?.mode === "delete" ? (
          <div className="text-sm text-slate-700">
            Delete group <span className="font-medium">{groupModal.title}</span>? Lists in this group will be deleted.
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-slate-600">Title</div>
              <Input
                className="mt-2"
                autoFocus
                value={groupTitleDraft}
                onChange={(e) => setGroupTitleDraft(e.target.value)}
                placeholder="Group title"
              />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-600">Description (optional)</div>
              <Input
                className="mt-2"
                value={groupDescDraft}
                onChange={(e) => setGroupDescDraft(e.target.value)}
                placeholder="What is this group for?"
              />
            </div>
            {groupModal?.mode === "rename" ? (
              <div className="mt-1 text-xs text-slate-500">
                Want to delete instead?{" "}
                <button
                  className="text-rose-700 hover:underline"
                  onClick={() => setGroupModal({ mode: "delete", id: groupModal.id, title: groupModal.title })}
                >
                  Delete group
                </button>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      {/* List management */}
      <Modal
        open={Boolean(listModal)}
        title={
          listModal?.mode === "create" ? "New list" : listModal?.mode === "delete" ? "Delete list" : "Edit list"
        }
        onClose={() => setListModal(null)}
        footer={
          listModal ? (
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setListModal(null)}>
                Cancel
              </Button>
              {listModal.mode === "delete" ? (
                <Button
                  className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800"
                  onClick={async () => {
                    await deleteTaskList({ id: listModal.id });
                    await qc.invalidateQueries({ queryKey: ["taskLists", workspaceId] });
                    await qc.invalidateQueries({ queryKey: ["taskPlacements", workspaceId] });
                    setListModal(null);
                  }}
                >
                  Delete
                </Button>
              ) : (
                <Button
                  onClick={async () => {
                    const title = listTitleDraft.trim();
                    if (listModal.mode === "create") {
                      await createTaskList({
                        workspaceId,
                        groupId: listModal.groupId,
                        type: listTypeDraft,
                        title
                      });
                    } else {
                      await updateTaskList({ id: listModal.id, title });
                    }
                    await qc.invalidateQueries({ queryKey: ["taskLists", workspaceId] });
                    setListModal(null);
                  }}
                  disabled={!listTitleDraft.trim().length}
                >
                  Save
                </Button>
              )}
            </div>
          ) : null
        }
      >
        {listModal?.mode === "delete" ? (
          <div className="text-sm text-slate-700">
            Delete list <span className="font-medium">{listModal.title}</span>? Placements in this list will be removed.
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-slate-600">Title</div>
              <Input
                className="mt-2"
                autoFocus
                value={listTitleDraft}
                onChange={(e) => setListTitleDraft(e.target.value)}
                placeholder="List title"
              />
            </div>
            {listModal?.mode === "create" ? (
              <div>
                <div className="text-xs font-medium text-slate-600">Type</div>
                <Select className="mt-2" value={listTypeDraft} onChange={(e) => setListTypeDraft(e.target.value as any)}>
                  <option value="person">Person</option>
                  <option value="project">Project</option>
                  <option value="time_slot">Time Slot</option>
                  <option value="other">Other</option>
                </Select>
                <div className="mt-2 text-xs text-slate-500">
                  (For MVP, type affects icon/behavior only. We’ll wire richer type-specific settings later.)
                </div>
              </div>
            ) : (
              <div className="mt-1 text-xs text-slate-500">
                Want to delete instead?{" "}
                <button
                  className="text-rose-700 hover:underline"
                  onClick={() => {
                    if (!listModal) return;
                    setListModal({ mode: "delete", id: listModal.id, title: listModal.title });
                  }}
                >
                  Delete list
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Unknown @name / (name) during Quick Entry */}
      <Modal
        open={Boolean(unknownMemberModal)}
        title="Add team member?"
        onClose={() => setUnknownMemberModal(null)}
        footer={
          unknownMemberModal ? (
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                onClick={async () => {
                  await quickCreateTaskFromEntry({
                    taskPart: unknownMemberModal.taskPart,
                    ownerId: null,
                    watcherIds: [],
                    titleMode: "raw",
                    op: unknownMemberModal.op,
                    listPart: unknownMemberModal.listPart
                  });
                  setUnknownMemberModal(null);
                }}
              >
                Treat as plain text
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setUnknownMemberModal(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={
                    !unknownMemberNameDraft.trim().length ||
                    (unknownMemberSendInvite && unknownMemberEmailDraft.trim().length < 5)
                  }
                  onClick={async () => {
                    if (!unknownMemberModal) return;
                    const profile = await createMemberPlaceholder({
                      workspaceId,
                      name: unknownMemberNameDraft.trim(),
                      email: unknownMemberEmailDraft.trim().length ? unknownMemberEmailDraft.trim() : null,
                      status: unknownMemberSendInvite ? "invited" : "active",
                      role: "member"
                    });
                    if (unknownMemberSendInvite && unknownMemberEmailDraft.trim().length) {
                      await createInvite({
                        workspaceId,
                        email: unknownMemberEmailDraft.trim(),
                        role: "member",
                        createdBy: session.user.id as any
                      });
                    }
                    await qc.invalidateQueries({ queryKey: ["profiles", workspaceId] });
                    await quickCreateTaskFromEntry({
                      taskPart: unknownMemberModal.taskPart,
                      ownerId: unknownMemberModal.kind === "owner" ? profile.id : unknownMemberModal.ownerId,
                      watcherIds:
                        unknownMemberModal.kind === "watcher"
                          ? [...unknownMemberModal.watcherIds, profile.id]
                          : unknownMemberModal.watcherIds,
                      titleMode: "strip",
                      op: unknownMemberModal.op,
                      listPart: unknownMemberModal.listPart
                    });
                    setUnknownMemberModal(null);
                  }}
                >
                  Create member
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        <div className="space-y-3 text-sm text-slate-700">
          <div>
            We couldn’t find{" "}
            <span className="font-medium">
              {unknownMemberModal?.token
                ? unknownMemberModal.kind === "owner"
                  ? `@${unknownMemberModal.token}`
                  : `(${unknownMemberModal.token})`
                : ""}
            </span>{" "}
            in this workspace.
          </div>
          <div>
            <div className="text-xs font-medium text-slate-600">Name</div>
            <Input
              className="mt-2"
              value={unknownMemberNameDraft}
              onChange={(e) => setUnknownMemberNameDraft(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-600">Email (optional)</div>
            <Input
              className="mt-2"
              value={unknownMemberEmailDraft}
              onChange={(e) => setUnknownMemberEmailDraft(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={unknownMemberSendInvite}
              onChange={(e) => setUnknownMemberSendInvite(e.target.checked)}
            />
            Send invite now (requires email)
          </label>
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


