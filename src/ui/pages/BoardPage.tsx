import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronDown, ChevronRight, Eye, Filter, GripVertical, MoreHorizontal, Plus, Tag, Users, CheckCircle2, MessageSquare } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDrop } from "react-dnd";

import {
  createTaskGroup,
  createTaskList,
  createMemberPlaceholder,
  createInvite,
  createTask,
  createTaskPlacement,
  deleteTask,
  deleteTaskGroup,
  deleteTaskList,
  deleteTaskPlacementByTaskAndList,
  deleteWorkspace,
  getWorkspace,
  listProfiles,
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
  updateTask,
  getLastEntry,
  duplicateTask
} from "../../data/client";
import { toast } from "react-toastify";
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
import { InlineEditableText } from "../components/InlineEditableText";
import { DraggableTask } from "../components/DraggableTask";
import { DroppableListCard, DoneSection } from "../components/DroppableListCard";
import { useQueryClient } from "@tanstack/react-query";
import { DISPLAY_KEY, loadDisplayPrefs, type DisplayPrefs } from "../state/displayPrefs";
import { useStubSession } from "../../auth/stubAuth";
import { getUniqueName } from "../../utils/nameUtils";

const DND_MIME = "application/x-nxtup-task";
type DragPayload = { taskId: string; fromListId?: string | null };
const LAST_UNGROUPED_KEY_PREFIX = "nxtup.lastUngroupedListId.v1.";
const GROUP_COLLAPSE_KEY_PREFIX = "nxtup.groupCollapsedById.v1.";

function formatDueDate(date?: string) {
  if (!date) return null;
  return date;
}

function priorityVariant(p: Task["priority"]): "low" | "medium" | "high" | "critical" {
  return p;
}

function ScrollDots({
  scrollerRef,
  dotCount
}: {
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  dotCount: number;
}) {
  const [activeDot, setActiveDot] = React.useState(0);
  const [show, setShow] = React.useState(false);

  React.useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const node: HTMLDivElement = el;

    function recalc() {
      // Only show dots when the row is actually horizontally scrollable.
      setShow(node.scrollWidth - node.clientWidth > 4);
    }

    function onScroll() {
      if (dotCount <= 1) {
        setActiveDot(0);
        return;
      }

      const first = node.firstElementChild as HTMLElement | null;
      const childW = first?.clientWidth ?? 0;
      const styles = getComputedStyle(node);
      const gapRaw = styles.columnGap || styles.gap || "0px";
      const gap = Number.parseFloat(gapRaw) || 0;
      const step = Math.max(1, childW + gap);
      const idx = Math.round(node.scrollLeft / step);
      setActiveDot(Math.max(0, Math.min(dotCount - 1, idx)));
    }

    recalc();
    onScroll();

    node.addEventListener("scroll", onScroll, { passive: true });
    const RO = typeof ResizeObserver !== "undefined" ? ResizeObserver : null;
    const ro = RO ? new RO(() => {
      recalc();
      onScroll();
    }) : null;
    ro?.observe(node);

    return () => {
      node.removeEventListener("scroll", onScroll);
      ro?.disconnect();
    };
  }, [scrollerRef, dotCount]);

  if (!show || dotCount <= 1) return null;

  return (
    <div className="mt-2 flex justify-center">
      <div className="inline-flex items-center gap-2">
        {Array.from({ length: dotCount }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full bg-slate-300 transition-colors",
              i === activeDot && "bg-slate-600"
            )}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}

function HorizontalScrollRow({ children, dotCount }: { children: React.ReactNode; dotCount: number }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  return (
    <div>
      <div
        ref={ref}
        className={cn(
          "flex gap-5 overflow-x-auto px-2 -mx-2 py-1 -my-1 pb-3",
          "[&>*:first-child]:ml-1",
          // Hide native horizontal scrollbar (keep trackpad/scrollwheel scrolling).
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {children}
      </div>
      <ScrollDots scrollerRef={ref} dotCount={dotCount} />
    </div>
  );
}

function DroppableAddListButton({
  groupId,
  workspaceId,
  onDrop,
  onAddClick
}: {
  groupId: string | null;
  workspaceId: string;
  onDrop: (listId: string) => void;
  onAddClick: () => void;
}) {
  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: "LIST",
    drop: (item: { listId: string; listGroupId?: string | null }) => {
      if ((item.listGroupId || null) !== (groupId || null)) {
        onDrop(item.listId);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  return (
    <button
      ref={dropRef as any}
      onClick={onAddClick}
      className={cn(
        "w-[320px] shrink-0 rounded-lg flex items-center justify-center transition-all duration-300 ease-in-out overflow-hidden self-start",
        isOver && canDrop
          ? "h-[240px] border-2 border-dashed border-primary bg-primary-50/50 text-primary text-sm font-medium"
          : "h-[40px] border border-dashed border-border text-muted-foreground hover:bg-accent hover:border-border-hover hover:text-foreground-muted text-xs font-medium"
      )}
    >
      + Add list
    </button>
  );
}

function DroppableAddGroupButton({
  onDropCreateGroup,
  onAddClick
}: {
  onDropCreateGroup: (listId: string) => void;
  onAddClick: () => void;
}) {
  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: "LIST",
    drop: (item: { listId: string }) => {
      onDropCreateGroup(item.listId);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  return (
    <button
      ref={dropRef as any}
      onClick={onAddClick}
      className={cn(
        "mt-8 mb-12 w-full rounded-xl border-2 border-dashed p-8 text-center text-sm font-medium transition flex items-center justify-center",
        isOver && canDrop
          ? "border-primary bg-primary-50/50 text-primary"
          : "border-border text-muted-foreground hover:border-border-hover hover:bg-accent hover:text-foreground-muted"
      )}
    >
      + Add Group
    </button>
  );
}

function DroppableGroupHeader({
  group,
  groupListsLength,
  groupVisibleTaskCount,
  isCollapsed,
  workspaceId,
  onToggleCollapse,
  onToggleCollapseAll,
  onAddList,
  onDeleteGroup,
  onDropList
}: {
  group: { id: string; title: string; description?: string | null };
  groupListsLength: number;
  groupVisibleTaskCount: number;
  isCollapsed: boolean;
  workspaceId: string;
  onToggleCollapse: (collapsed: boolean) => void;
  onToggleCollapseAll: (collapsed: boolean) => void;
  onAddList: () => void;
  onDeleteGroup: () => void;
  onDropList: (listId: string) => void;
}) {
  const qc = useQueryClient();
  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: "LIST",
    drop: (item: { listId: string; listGroupId?: string | null }) => {
      if ((item.listGroupId || null) !== (group.id || null)) {
        onDropList(item.listId);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  return (
    <div
      ref={dropRef as any}
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl p-3 -mx-3 transition-colors",
        isOver && canDrop ? "border-2 border-dashed border-primary bg-primary-50/50" : "border-2 border-transparent"
      )}
    >
      <div className="min-w-0 flex-1">
        <InlineEditableText
          value={group.title}
          ariaLabel={`Rename group ${group.title}`}
          className="block w-full text-lg font-semibold text-foreground"
          inputClassName="h-9 text-lg font-semibold"
          onConfirm={async (next) => {
            await updateTaskGroup({ id: group.id, title: next });
            await qc.invalidateQueries({ queryKey: ["taskGroups", workspaceId] });
          }}
        />
        <InlineEditableText
          value={group.description ?? ""}
          placeholder="Add group description…"
          ariaLabel="Edit group description"
          allowEmpty
          truncate={false}
          className="mt-1 block w-full text-sm text-muted-foreground whitespace-normal"
          inputClassName="h-8 text-sm border-0 bg-transparent px-0 rounded-none focus:ring-0"
          onConfirm={async (next) => {
            await updateTaskGroup({
              id: group.id,
              description: next.trim().length ? next.trim() : null
            });
            await qc.invalidateQueries({ queryKey: ["taskGroups", workspaceId] });
          }}
        />
        <div className="mt-1 text-xs text-muted">
          {groupListsLength} {groupListsLength === 1 ? "list" : "lists"} • {groupVisibleTaskCount}{" "}
          {groupVisibleTaskCount === 1 ? "task" : "tasks"}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          aria-label={isCollapsed ? "Expand group" : "Collapse group"}
          title={isCollapsed ? "Expand" : "Collapse"}
          onClick={(e) => {
            const nextCollapsed = !isCollapsed;
            if (e.altKey || e.shiftKey) {
              onToggleCollapseAll(nextCollapsed);
              return;
            }
            onToggleCollapse(nextCollapsed);
          }}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onAddList}
        >
          <Plus size={16} className="text-muted-foreground" />
          Add list
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Group actions"
          title="Delete group"
          onClick={onDeleteGroup}
        >
          <MoreHorizontal size={18} />
        </Button>
      </div>
    </div>
  );
}

export function BoardPage() {
  const { workspaceId = "demo" } = useParams();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleTaskDrop = async (taskId: string, listId: string, fromListId: string | null) => {
    try {
      await updateTask({ id: taskId, location: "board" });
      await createTaskPlacement({
        workspaceId,
        taskId,
        listId,
        createdBy: session.user.id
      });
      if (fromListId && fromListId !== listId) {
        await deleteTaskPlacementByTaskAndList({ workspaceId, taskId, listId: fromListId });
      }
      setLastUngroupedListId(listId);
      await qc.invalidateQueries({ queryKey: ["taskPlacements", workspaceId] });
      await qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    } catch (err) {
      console.error("[DnD] drop failed", err);
    }
  };


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
  const [addMenuOpen, setAddMenuOpen] = React.useState(false);
  const addMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setAddMenuOpen(false);
      }
    }
    if (addMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [addMenuOpen]);
  const [createTargetListId, setCreateTargetListId] = React.useState<string | null>(null);
  const [createTargetUnlistedGroupId, setCreateTargetUnlistedGroupId] = React.useState<string | null | undefined>(undefined);
  const [collapsedGroupsById, setCollapsedGroupsById] = React.useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(`${GROUP_COLLAPSE_KEY_PREFIX}${workspaceId}`);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object") return parsed as Record<string, boolean>;
    } catch {
      // ignore
    }
    return {};
  });

  // Workspace / group / list management modals
  const [workspaceModal, setWorkspaceModal] = React.useState<
    | null
    | { mode: "delete"; id: string; name: string }
  >(null);

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
    if (!listModal) {
      setListTitleDraft("");
      setListTypeDraft("other");
    }
  }, [listModal]);

  React.useEffect(() => {
    if (!groupModal) {
      setGroupTitleDraft("");
      setGroupDescDraft("");
    }
  }, [groupModal]);

  React.useEffect(() => {
    try {
      localStorage.setItem(DISPLAY_KEY, JSON.stringify(display));
    } catch {
      // ignore
    }
  }, [display]);

  // Keep collapse state scoped per workspace.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(`${GROUP_COLLAPSE_KEY_PREFIX}${workspaceId}`);
      const parsed = raw ? JSON.parse(raw) : null;
      setCollapsedGroupsById(parsed && typeof parsed === "object" ? (parsed as Record<string, boolean>) : {});
    } catch {
      setCollapsedGroupsById({});
    }
  }, [workspaceId]);

  React.useEffect(() => {
    try {
      localStorage.setItem(`${GROUP_COLLAPSE_KEY_PREFIX}${workspaceId}`, JSON.stringify(collapsedGroupsById));
    } catch {
      // ignore
    }
  }, [collapsedGroupsById, workspaceId]);

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

  const participantsQ = useQuery({
    queryKey: ["taskParticipants", workspaceId],
    queryFn: () => listTaskParticipants(workspaceId)
  });

  const workspaceName = workspaceQ.data?.name ?? "Workspace";
  const workspaceDescription = workspaceQ.data?.description ?? null;
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

  const ungroupedLists = React.useMemo(
    () =>
      lists
        .filter((l) => l.groupId == null && l.type !== "inbox")
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [lists]
  );
  const groupedListIds = React.useMemo(() => new Set(lists.filter((l) => l.groupId).map((l) => l.id)), [lists]);
  const ungroupedListIds = React.useMemo(() => new Set(ungroupedLists.map((l) => l.id)), [ungroupedLists]);
  const canvasListIds = React.useMemo(() => {
    const s = new Set<string>();
    for (const id of groupedListIds) s.add(id);
    for (const id of ungroupedListIds) s.add(id);
    return s;
  }, [groupedListIds, ungroupedListIds]);
  const canvasPlacements = React.useMemo(
    () => placements.filter((p) => canvasListIds.has(p.listId)),
    [placements, canvasListIds]
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
    setCreateTargetListId(null);
    setCreateTargetUnlistedGroupId(undefined);
    if (searchParams.get("task")) {
      const next = new URLSearchParams(searchParams);
      next.delete("task");
      setSearchParams(next, { replace: true });
    }
  }

  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const priority = (searchParams.get("priority") ?? "").trim().toLowerCase();
  const due = (searchParams.get("due") ?? "").trim().toLowerCase(); // "overdue" | "next7"

  // Identify tasks that are on the board, but have no placements tying them to any list
  const canvasTaskIdSet = React.useMemo(() => new Set(canvasPlacements.map((p) => p.taskId)), [canvasPlacements]);

  const canvasPlacedTasks = React.useMemo(
    () => boardTasks.filter((t) => canvasTaskIdSet.has(t.id)),
    [boardTasks, canvasTaskIdSet]
  );

  const unlistedBoardTasks = React.useMemo(
    () => boardTasks.filter((t) => !canvasTaskIdSet.has(t.id)),
    [boardTasks, canvasTaskIdSet]
  );

  function applyFilters(task: Task) {
    if (q.length) {
      const assigneeName = profiles.find((p) => p.id === task.assigneeId)?.name ?? "";
      const haystack = `${task.title} ${assigneeName} ${task.tags.join(" ")}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (priority.length && task.priority !== priority) return false;
    if (due.length) {
      if (!task.dueDate) return false;
      const today = new Date();
      const dueDate = new Date(`${task.dueDate}T00:00:00`);
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
  }
  const filteredTasks = canvasPlacedTasks.filter(applyFilters);
  const filteredUnlistedTasks = unlistedBoardTasks.filter(applyFilters);

  const unlistedTasksByGroupId = React.useMemo(() => {
    const m = new Map<string | null, Task[]>();
    for (const t of filteredUnlistedTasks) {
      const gid = t.groupId ?? null;
      const arr = m.get(gid) ?? [];
      arr.push(t);
      m.set(gid, arr);
    }
    return m;
  }, [filteredUnlistedTasks]);

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
    for (const p of canvasPlacements) {
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
  }, [canvasPlacements]);

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
  const inboxP = placements.find((p) => p.listId === inboxList?.id);

  function getLastUngroupedListId(): string | null {
    try {
      return localStorage.getItem(`${LAST_UNGROUPED_KEY_PREFIX}${workspaceId}`);
    } catch {
      return null;
    }
  }

  function setLastUngroupedListId(listId: string) {
    try {
      localStorage.setItem(`${LAST_UNGROUPED_KEY_PREFIX}${workspaceId}`, listId);
    } catch {
      // ignore
    }
  }

  async function createUngroupedList(): Promise<TaskList | null> {
    const count = ungroupedLists.length;
    if (count >= 3) return null;
    const title = count === 0 ? "Inbox (workspace)" : `Inbox (workspace) ${count + 1}`;
    const created = await createTaskList({
      workspaceId,
      groupId: null,
      type: "other",
      title
    });
    await qc.invalidateQueries({ queryKey: ["taskLists", workspaceId] });
    return created;
  }

  async function ensureUngroupedListForCapture(): Promise<TaskList | null> {
    const lastId = getLastUngroupedListId();
    const last = lastId ? ungroupedLists.find((l) => l.id === lastId) ?? null : null;
    if (last) return last;
    if (ungroupedLists[0]) return ungroupedLists[0];
    return await createUngroupedList();
  }

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
    const baseTitle = input.titleMode === "strip" ? stripPeopleHints(input.taskPart) : input.taskPart.trim();
    const existingTitles = tasks.map(t => t.title);
    const title = await getUniqueName(baseTitle, existingTitles);

    const created = await createTask({
      workspaceId,
      createdBy: session.user.id,
      title,
      priority: "medium",
      location: "inbox",
      assigneeId: input.ownerId
    });
    toast.success("Task created");

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
            <InlineEditableText
              value={workspaceName}
              ariaLabel="Rename workspace"
              className="text-2xl font-semibold text-foreground"
              inputClassName="h-9 text-2xl font-semibold"
              onConfirm={async (next) => {
                await updateWorkspace({ id: workspaceId as any, name: next });
                await qc.invalidateQueries({ queryKey: ["workspaces"] });
                await qc.invalidateQueries({ queryKey: ["workspace", workspaceId] });
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              aria-label="Workspace menu"
              title="Workspace actions"
              onClick={() => setWorkspaceModal({ mode: "delete", id: workspaceId, name: workspaceName })}
            >
              <MoreHorizontal size={18} />
            </Button>
          </div>
          <div className="mt-1">
            <InlineEditableText
              value={workspaceDescription ?? ""}
              placeholder="Add a workspace description…"
              ariaLabel="Edit workspace description"
              allowEmpty
              truncate={false}
              className="block w-full text-sm text-muted-foreground"
              // Minimal inline editor: no new “box” chrome, just text-on-background.
              inputClassName="h-8 text-sm border-0 bg-transparent px-0 rounded-none focus:ring-0"
              onConfirm={async (next) => {
                await updateWorkspace({
                  id: workspaceId as any,
                  name: workspaceName,
                  description: next.trim().length ? next.trim() : null
                });
                await qc.invalidateQueries({ queryKey: ["workspaces"] });
                await qc.invalidateQueries({ queryKey: ["workspace", workspaceId] });
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary">
            <Users size={16} className="text-muted-foreground" />
            Team Members
          </Button>
          <div ref={addMenuRef} className="relative flex shadow-sm rounded-lg">
            <Button
              className="rounded-e-none pr-3 focus:z-10"
              onClick={() => {
                setAddMenuOpen(false);
                setCreateTargetListId(null);
                setCreateTargetUnlistedGroupId(undefined);
                setDrawerMode("create");
                setActiveTaskId(null);
                setDrawerOpen(true);
              }}
            >
              <Plus size={16} />
              Add task
            </Button>
            <Button
              className="rounded-s-none px-2 border-l border-blue-700/30 shadow-none focus:z-10"
              onClick={() => setAddMenuOpen((v) => !v)}
              aria-expanded={addMenuOpen}
              aria-haspopup="menu"
              title="Add options…"
            >
              <ChevronDown size={16} />
            </Button>

            {addMenuOpen ? (
              <div
                className="absolute right-0 top-[110%] w-56 rounded-xl border border-border bg-card p-1 shadow-card z-20"
                role="menu"
              >

                <button
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left text-sm",
                    ungroupedLists.length >= 3 ? "text-muted cursor-not-allowed" : "text-foreground-muted hover:bg-accent"
                  )}
                  role="menuitem"
                  disabled={ungroupedLists.length >= 3}
                  onClick={() => {
                    setAddMenuOpen(false);
                    setListTitleDraft("");
                    setListTypeDraft("other");
                    setListModal({ mode: "create", groupId: null });
                  }}
                >
                  Add List (ungrouped)
                  <div className="text-xs text-muted-foreground">Up to 3 per workspace</div>
                </button>

                <button
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-foreground-muted hover:bg-accent"
                  role="menuitem"
                  onClick={() => {
                    setAddMenuOpen(false);
                    setGroupTitleDraft("");
                    setGroupDescDraft("");
                    setGroupModal({ mode: "create" });
                  }}
                >
                  Add Group
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm">
            <Tag size={16} className="text-muted-foreground" />
            Tags
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDisplayOpen(true)}>
            <Eye size={16} className="text-muted-foreground" />
            View
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Filter size={14} className="text-muted-foreground" />
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
            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Calendar size={14} className="text-muted-foreground" />
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
              if (raw === "/last") {
                const last = await getLastEntry(workspaceId);
                if (last) {
                  setDrawerMode("edit");
                  setActiveTaskId(last.id);
                  setDrawerOpen(true);
                  setQuickAddText("");
                } else {
                  toast.info("No recent entries found");
                }
                return;
              }
              if (raw === "/duplicate") {
                const last = await getLastEntry(workspaceId);
                if (last) {
                  const duplicated = await duplicateTask(workspaceId, last.id, session.user.id);
                  await qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
                  await qc.invalidateQueries({ queryKey: ["taskPlacements", workspaceId] });
                  toast.success("Task duplicated successfully");
                  setQuickAddText("");
                } else {
                  toast.info("No recent entries to duplicate");
                }
                return;
              }

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
            <div className="mt-2 rounded-lg border border-border bg-card p-2">
              <div className="text-xs font-medium text-muted-foreground">Possible matches</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Press <span className="font-medium">Enter</span> to open the top match. Press{" "}
                <span className="font-medium">⌘↵</span> to create anyway.
              </div>
              <div className="mt-1 space-y-1">
                {quickAddSuggestions.map((t, idx) => (
                  <button
                    key={t.id}
                    className={cn(
                      "w-full rounded-md px-2 py-1 text-left text-sm text-foreground-muted hover:bg-accent",
                      idx === quickAddActiveIdx && "bg-primary-50 ring-1 ring-blue-500/20"
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
        {/* Ungrouped lists (top zone) */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-medium text-muted-foreground">Ungrouped Lists</div>
            <div className="text-xs text-muted">Up to 3 lists</div>
          </div>
          <HorizontalScrollRow dotCount={ungroupedLists.slice(0, 3).length + 1}>
            {/* Standard Ungrouped Lists */}
            {ungroupedLists.slice(0, 3).map((list) => {
              const listPlacements = placementsByList.get(list.id) ?? [];
              const listTasks = listPlacements
                .map((p) => tasksById.get(p.taskId))
                .filter((t): t is Task => t != null)
                .filter((t) => filteredTaskIdSet.has(t.id));
              const count = listTasks.length;
              return (
                <DroppableListCard
                  key={list.id}
                  listId={list.id}
                  isDraggable={list.type !== "inbox"}
                  className="w-[320px] shrink-0 p-4"
                  onTaskDrop={(taskId, fromListId) => handleTaskDrop(taskId, list.id, fromListId)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-xs font-semibold text-muted-foreground">
                        L
                      </div>
                      <div className="min-w-0">
                        <InlineEditableText
                          value={list.title}
                          ariaLabel={`Rename list ${list.title}`}
                          className="block w-full font-semibold text-foreground"
                          onConfirm={async (next) => {
                            await updateTaskList({ id: list.id, title: next });
                            await qc.invalidateQueries({ queryKey: ["taskLists", workspaceId] });
                          }}
                        />
                        <InlineEditableText
                          value={list.description ?? ""}
                          placeholder="Add list description…"
                          ariaLabel="Edit list description"
                          allowEmpty
                          truncate={false}
                          className="mt-1 block w-full text-xs text-muted-foreground whitespace-normal"
                          inputClassName="h-7 text-xs border-0 bg-transparent px-0 rounded-none focus:ring-0"
                          onConfirm={async (next) => {
                            await updateTaskList({
                              id: list.id,
                              title: next.trim().length ? next.trim() : list.title
                            });
                            await qc.invalidateQueries({ queryKey: ["taskLists", workspaceId] });
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-2 font-medium text-foreground-muted">
                        {count}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="List actions"
                        title="Delete list"
                        onClick={() => {
                          setListModal({ mode: "delete", id: list.id, title: list.title });
                        }}
                      >
                        <MoreHorizontal size={18} />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 space-y-[2px]">
                    {listTasks.filter(t => t.status !== "done").map((t) => (
                      <DraggableTask
                        key={t.id}
                        task={t}
                        fromListId={list.id}
                        onClick={() => {
                          setDrawerMode("edit");
                          setActiveTaskId(t.id);
                          setDrawerOpen(true);
                          setLastUngroupedListId(list.id);
                        }}
                        display={display}
                      />
                    ))}
                    <button
                      onClick={() => {
                        setCreateTargetListId(list.id);
                        setCreateTargetUnlistedGroupId(undefined);
                        setDrawerMode("create");
                        setDrawerOpen(true);
                        setLastUngroupedListId(list.id);
                      }}
                      className="w-full mt-2 rounded-lg border border-dashed border-border p-3 text-center text-xs font-medium text-muted-foreground hover:bg-accent hover:border-border-hover hover:text-foreground-muted transition-colors"
                    >
                      + Add task
                    </button>
                    {count === 0 && (
                      <div className="mt-4 text-center text-xs font-semibold text-muted tracking-wide">
                        OR DROP TASKS HERE
                      </div>
                    )}
                  </div>
                  <DoneSection
                    tasks={listTasks.filter((t) => t.status === "done")}
                    renderTask={(t) => (
                      <DraggableTask
                        key={t.id}
                        task={t}
                        fromListId={list.id}
                        onClick={() => {
                          setDrawerMode("edit");
                          setActiveTaskId(t.id);
                          setDrawerOpen(true);
                          setLastUngroupedListId(list.id);
                        }}
                        display={display}
                      />
                    )}
                  />
                </DroppableListCard>
              );
            })}
            {ungroupedLists.length < 3 ? (
              <DroppableAddListButton
                groupId={null}
                workspaceId={workspaceId}
                onDrop={async (listId) => {
                  await updateTaskList({ id: listId, groupId: null });
                  await qc.invalidateQueries({ queryKey: ["taskLists", workspaceId] });
                }}
                onAddClick={() => {
                  setListTitleDraft("");
                  setListTypeDraft("other");
                  setListModal({ mode: "create", groupId: null });
                }}
              />
            ) : null}

            {/* Unlisted (Orphaned) Tasks - Appended to the end */}
            <DroppableListCard
              key="unlisted-virtual-list"
              listId="unlisted-virtual-list"
              flat={true}
              className="w-[320px] shrink-0 p-4 flex flex-col"
              onTaskDrop={async (taskId, fromListId) => {
                // If dropped here, we want to REMOVE it from any lists but keep it on the board.
                const ps = placements.filter((p) => p.taskId === taskId);
                if (ps.length > 0) {
                  await Promise.all(
                    ps.map((p) =>
                      deleteTaskPlacementByTaskAndList({
                        workspaceId,
                        taskId,
                        listId: p.listId
                      })
                    )
                  );
                  await qc.invalidateQueries({ queryKey: ["taskPlacements", workspaceId] });
                }
                updateTask({ id: taskId, location: "board", groupId: null, assigneeId: null });
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent-hover text-xs font-semibold text-muted-foreground">
                    ?
                  </div>
                  <div className="min-w-0">
                    <div className="block w-full font-semibold text-foreground-muted">Unlisted Tasks</div>
                    <div className="mt-1 block w-full text-xs text-muted whitespace-normal">
                      Tasks on the board with no list
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-2 font-medium text-foreground-muted">
                    {(unlistedTasksByGroupId.get(null) ?? []).length}
                  </span>
                </div>
              </div>
              <div className="mt-4 space-y-[2px]">
                {(unlistedTasksByGroupId.get(null) ?? []).filter(t => t.status !== "done").map((t) => (
                  <DraggableTask
                    key={t.id}
                    task={t}
                    fromListId={null} // Null fromListId identifies it came from unlisted
                    onClick={() => {
                      setDrawerMode("edit");
                      setActiveTaskId(t.id);
                      setDrawerOpen(true);
                      setLastUngroupedListId(null as any);
                    }}
                    display={display}
                  />
                ))}
                <button
                  onClick={() => {
                    setCreateTargetListId(null);
                    setCreateTargetUnlistedGroupId(null);
                    setDrawerMode("create");
                    setDrawerOpen(true);
                    setLastUngroupedListId(null as any);
                  }}
                  className="w-full mt-2 rounded-lg border border-dashed border-border p-3 text-center text-xs font-medium text-muted-foreground hover:bg-accent hover:border-border-hover hover:text-foreground-muted transition-colors"
                >
                  + Add task
                </button>
              </div>
              <DoneSection
                tasks={(unlistedTasksByGroupId.get(null) ?? []).filter((t) => t.status === "done")}
                renderTask={(t) => (
                  <DraggableTask
                    key={t.id}
                    task={t}
                    fromListId={null}
                    onClick={() => {
                      setDrawerMode("edit");
                      setActiveTaskId(t.id);
                      setDrawerOpen(true);
                    }}
                    display={display}
                  />
                )}
              />
            </DroppableListCard>
          </HorizontalScrollRow>
        </section>
        {groups
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((group, idx) => {
            const groupLists = listsByGroup.get(group.id) ?? [];
            const isCollapsed = collapsedGroupsById[group.id] ?? false;
            const groupVisibleTaskCount = (() => {
              const set = new Set<string>();
              for (const l of groupLists) {
                const ps = placementsByList.get(l.id) ?? [];
                for (const p of ps) {
                  const t = tasksById.get(p.taskId);
                  if (t && filteredTaskIdSet.has(t.id)) set.add(t.id);
                }
              }
              return set.size;
            })();
            return (
              <section
                key={group.id}
                className={cn(
                  // Header-only group styling: no outer “card”. Use subtle dividers + spacing.
                  idx === 0 ? "pt-2" : "mt-6 border-t border-border pt-6"
                )}
              >
                <DroppableGroupHeader
                  group={group}
                  groupListsLength={groupLists.length}
                  groupVisibleTaskCount={groupVisibleTaskCount}
                  isCollapsed={isCollapsed}
                  workspaceId={workspaceId}
                  onToggleCollapse={(collapsed) => setCollapsedGroupsById((prev) => ({ ...prev, [group.id]: collapsed }))}
                  onToggleCollapseAll={(collapsed) => {
                    setCollapsedGroupsById((prev) => {
                      const next = { ...prev };
                      for (const g of groups) next[g.id] = collapsed;
                      return next;
                    });
                  }}
                  onAddList={() => {
                    setListTitleDraft("");
                    setListTypeDraft("other");
                    setListModal({ mode: "create", groupId: group.id });
                  }}
                  onDeleteGroup={() => setGroupModal({ mode: "delete", id: group.id, title: group.title })}
                  onDropList={async (listId) => {
                    await updateTaskList({ id: listId, groupId: group.id });
                    await qc.invalidateQueries({ queryKey: ["taskLists", workspaceId] });
                  }}
                />

                {isCollapsed ? null : (
                  <div className="mt-4">
                    <HorizontalScrollRow dotCount={groupLists.length}>
                      {groupLists.map((list) => {
                        const listPlacements = placementsByList.get(list.id) ?? [];
                        const listTasks = listPlacements
                          .map((p) => tasksById.get(p.taskId))
                          .filter((t): t is Task => t != null && filteredTaskIdSet.has(t.id));
                        const count = listTasks.length;

                        const person =
                          list.type === "person" && list.refId ? profiles.find((p) => p.id === list.refId) ?? null : null;

                        return (
                          <DroppableListCard
                            key={list.id}
                            listId={list.id}
                            listGroupId={list.groupId}
                            isDraggable={list.type !== "inbox"}
                            className="w-[320px] shrink-0 p-4"
                            onTaskDrop={(taskId, fromListId) => {
                              const person = list.type === "person" && list.refId ? profiles.find((p) => p.id === list.refId) ?? null : null;
                              if (list.type === "person" && person) {
                                updateTask({ id: taskId, assigneeId: person.id, location: "board" });
                              }
                              handleTaskDrop(taskId, list.id, fromListId);
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2">
                                {person ? (
                                  <Avatar name={person.name} src={person.avatarUrl} className="h-8 w-8 text-xs" />
                                ) : (
                                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-xs font-semibold text-muted-foreground">
                                    {list.type === "project" ? "P" : list.type === "time_slot" ? "T" : "L"}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <InlineEditableText
                                    value={list.title}
                                    ariaLabel={`Rename list ${list.title}`}
                                    className="block w-full font-semibold text-foreground"
                                    onConfirm={async (next) => {
                                      await updateTaskList({ id: list.id, title: next });
                                      await qc.invalidateQueries({ queryKey: ["taskLists", workspaceId] });
                                    }}
                                  />
                                  <InlineEditableText
                                    value={list.description ?? ""}
                                    placeholder="Add list description…"
                                    ariaLabel="Edit list description"
                                    allowEmpty
                                    truncate={false}
                                    className="mt-1 block w-full text-xs text-muted-foreground whitespace-normal"
                                    inputClassName="h-7 text-xs border-0 bg-transparent px-0 rounded-none focus:ring-0"
                                    onConfirm={async (next) => {
                                      await updateTaskList({
                                        id: list.id,
                                        description: next.trim().length ? next.trim() : null
                                      });
                                      await qc.invalidateQueries({ queryKey: ["taskLists", workspaceId] });
                                    }}
                                  />
                                  {person ? (
                                    <div className="mt-1 text-xs text-muted">Person: {person.name}</div>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-2 font-medium text-foreground-muted">
                                  {count}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label="List actions"
                                  title="Delete list"
                                  onClick={() => {
                                    setListModal({ mode: "delete", id: list.id, title: list.title });
                                  }}
                                >
                                  <MoreHorizontal size={18} />
                                </Button>
                              </div>
                            </div>

                            <div className="mt-4 space-y-[2px]">
                              {listTasks.filter(t => t.status !== "done").map((t) => (
                                <DraggableTask
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
                              <button
                                onClick={() => {
                                  setCreateTargetListId(list.id);
                                  setCreateTargetUnlistedGroupId(undefined);
                                  setDrawerMode("create");
                                  setDrawerOpen(true);
                                }}
                                className="w-full mt-2 rounded-lg border border-dashed border-border p-3 text-center text-xs font-medium text-muted-foreground hover:bg-accent hover:border-border-hover hover:text-foreground-muted transition-colors"
                              >
                                + Add task
                              </button>
                              {count === 0 && (
                                <div className="mt-4 text-center text-xs font-semibold text-muted tracking-wide">
                                  OR DROP TASKS HERE
                                </div>
                              )}
                            </div>
                            <DoneSection
                              tasks={listTasks.filter((t) => t.status === "done")}
                              renderTask={(t) => (
                                <DraggableTask
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
                              )}
                            />
                          </DroppableListCard>
                        );
                      })}
                      {/* Unlisted Tasks for this specific Group */}
                      <DroppableListCard
                        listId={`unlisted-group-${group.id}`}
                        flat={true}
                        className="w-[320px] shrink-0 p-4 flex flex-col"
                        onTaskDrop={async (taskId, fromListId) => {
                          const task = tasksById.get(taskId);
                          if (!task) return;

                          // 1. Delete placement from old list (if it was in one)
                          if (fromListId) {
                            await deleteTaskPlacementByTaskAndList({
                              workspaceId,
                              taskId,
                              listId: fromListId,
                            });
                          }

                          // 2. Assign specifically to this Group
                          await updateTask({ id: taskId, location: "board", groupId: group.id });

                          // 3. Invalidate
                          await Promise.all([
                            qc.invalidateQueries({ queryKey: ["taskPlacements", workspaceId] }),
                            qc.invalidateQueries({ queryKey: ["tasks", workspaceId] }),
                          ]);
                        }}
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div className="font-semibold text-foreground">Unlisted Tasks</div>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-[2px] pb-2">
                          {(unlistedTasksByGroupId.get(group.id) ?? []).length === 0 ? (
                            <button
                              onClick={() => {
                                setCreateTargetListId(null);
                                setCreateTargetUnlistedGroupId(group.id);
                                setDrawerMode("create");
                                setDrawerOpen(true);
                                setLastUngroupedListId(null as any); // Might need to pass groupId here eventually
                              }}
                              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-muted-foreground hover:bg-accent-hover hover:text-foreground-muted"
                            >
                              <Plus size={16} />
                              Add task
                            </button>
                          ) : null}
                          {(unlistedTasksByGroupId.get(group.id) ?? []).filter((t) => t.status === "active").map((t) => (
                            <DraggableTask
                              key={t.id}
                              task={t}
                              fromListId={null}
                              onClick={() => {
                                setDrawerMode("edit");
                                setActiveTaskId(t.id);
                                setDrawerOpen(true);
                              }}
                              display={display}
                            />
                          ))}
                          {(unlistedTasksByGroupId.get(group.id) ?? []).filter((t) => t.status === "active").length > 0 && (
                            <button
                              onClick={() => {
                                // For unlisted group tasks we don't set a createTargetListId, just open drawer
                                setDrawerMode("create");
                                setDrawerOpen(true);
                              }}
                              className="w-full mt-2 rounded-lg border border-dashed border-border p-3 text-center text-xs font-medium text-muted-foreground hover:bg-accent hover:border-border-hover hover:text-foreground-muted transition-colors"
                            >
                              + Add task
                            </button>
                          )}
                        </div>
                        <DoneSection
                          tasks={(unlistedTasksByGroupId.get(group.id) ?? []).filter((t) => t.status === "done")}
                          renderTask={(t) => (
                            <DraggableTask
                              key={t.id}
                              task={t}
                              fromListId={null}
                              onClick={() => {
                                setDrawerMode("edit");
                                setActiveTaskId(t.id);
                                setDrawerOpen(true);
                              }}
                              display={display}
                            />
                          )}
                        />
                      </DroppableListCard>
                      <DroppableAddListButton
                        groupId={group.id}
                        workspaceId={workspaceId}
                        onDrop={async (listId) => {
                          await updateTaskList({ id: listId, groupId: group.id });
                          await qc.invalidateQueries({ queryKey: ["taskLists", workspaceId] });
                        }}
                        onAddClick={() => setListModal({ mode: "create", groupId: group.id })}
                      />
                    </HorizontalScrollRow>
                  </div>
                )}
              </section>
            );
          })}

        {/* Add Group Placeholder */}
        <DroppableAddGroupButton
          onAddClick={() => setGroupModal({ mode: "create" })}
          onDropCreateGroup={async (listId) => {
            const newGroup = await createTaskGroup({
              workspaceId,
              title: "New Group",
              sortOrder: groups.length
            });
            await updateTaskList({ id: listId, groupId: newGroup.id });
            await qc.invalidateQueries({ queryKey: ["taskGroups", workspaceId] });
            await qc.invalidateQueries({ queryKey: ["taskLists", workspaceId] });
          }}
        />
      </div>

      <TaskDrawer
        open={drawerOpen}
        mode={drawerMode}
        task={activeTask}
        profiles={profiles}
        currentUserId={session.user.id}
        lists={lists}
        groups={groups}
        createTargetListId={createTargetListId}
        createTargetUnlistedGroupId={createTargetUnlistedGroupId}
        onClose={closeTaskDrawer}
        onSave={async (values) => {
          let listIdToUse = values.listId;
          let locationToUse = values.location;

          // If a new list was typed into the TaskDrawer combobox, create it first.
          if (values.newListName) {
            const { getUniqueName } = await import("../../utils/nameUtils");
            const existingNames = lists.map(l => l.title);
            const finalName = getUniqueName(values.newListName.trim(), existingNames);

            const newList = await createTaskList({
              workspaceId,
              groupId: null,
              type: "other",
              title: finalName
            });
            listIdToUse = newList.id;
            locationToUse = "board";
            await qc.invalidateQueries({ queryKey: ["taskLists", workspaceId] });
          }

          if (drawerMode === "create") {
            // Respect the BoardPage context if "Add Task" was clicked from a specific column hook
            if (createTargetListId && !listIdToUse && locationToUse !== "inbox") {
              listIdToUse = createTargetListId;
              locationToUse = "board";
            }

            const isUnlistedCreation = createTargetListId === null && createTargetUnlistedGroupId !== undefined;

            const created = await createTask({
              workspaceId,
              createdBy: session.user.id,
              title: values.title,
              priority: values.priority,
              location: isUnlistedCreation ? "board" : locationToUse,
              dueDate: values.dueDate ?? undefined,
              assigneeId: values.assigneeId,
              groupId: isUnlistedCreation ? createTargetUnlistedGroupId : null
            });

            if (created.location === "board" && !isUnlistedCreation) {
              const list =
                (listIdToUse ? lists.find((l) => l.id === listIdToUse) ?? { id: listIdToUse, groupId: null, type: "other", title: values.newListName ?? "", sortOrder: 0, workspaceId } : null) ??
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
                if (list.groupId == null && list.type !== "inbox") setLastUngroupedListId(list.id);
                await qc.invalidateQueries({ queryKey: ["taskPlacements", workspaceId] });
              }
            } else if (created.location === "inbox" && inboxList) {
              await createTaskPlacement({
                workspaceId,
                taskId: created.id,
                listId: inboxList.id,
                createdBy: session.user.id
              });
              await qc.invalidateQueries({ queryKey: ["taskPlacements", workspaceId] });
            }
            await qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
            setCreateTargetListId(null);
            closeTaskDrawer();
            return;
          }

          if (activeTask) {
            await updateTask({
              id: activeTask.id,
              title: values.title,
              priority: values.priority,
              dueDate: values.dueDate ?? null,
              location: locationToUse,
              assigneeId: values.assigneeId
            });

            // Handle moving to a new list or inbox if list was explicitly picked
            if (listIdToUse && listIdToUse !== "inbox") {
              const ps = placements.filter((p) => p.taskId === activeTask.id);
              const inboxId = inboxList?.id ?? null;

              if (inboxId && ps.some(p => p.listId === inboxId)) {
                await deleteTaskPlacementByTaskAndList({
                  workspaceId, taskId: activeTask.id, listId: inboxId
                });
              }

              const singleNonInbox = ps.filter(p => p.listId !== inboxId)[0];
              if (singleNonInbox && singleNonInbox.listId !== listIdToUse) {
                await deleteTaskPlacementByTaskAndList({
                  workspaceId, taskId: activeTask.id, listId: singleNonInbox.listId
                });
              }

              if (!ps.some(p => p.listId === listIdToUse)) {
                await createTaskPlacement({
                  workspaceId, taskId: activeTask.id, listId: listIdToUse, createdBy: session.user.id
                });
              }
              await qc.invalidateQueries({ queryKey: ["taskPlacements", workspaceId] });
            } else if (locationToUse === "inbox" && activeTask.location !== "inbox") {
              const ps = placements.filter((p) => p.taskId === activeTask.id);
              const inboxId = inboxList?.id ?? null;
              for (const p of ps) {
                if (p.listId !== inboxId) {
                  await deleteTaskPlacementByTaskAndList({
                    workspaceId, taskId: activeTask.id, listId: p.listId
                  });
                }
              }
              if (inboxId && !ps.some(p => p.listId === inboxId)) {
                await createTaskPlacement({
                  workspaceId, taskId: activeTask.id, listId: inboxId, createdBy: session.user.id
                });
              }
              await qc.invalidateQueries({ queryKey: ["taskPlacements", workspaceId] });
            }

            await qc.invalidateQueries({ queryKey: ["taskParticipants", workspaceId] });
          }
          await qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
          closeTaskDrawer();
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
        <div className="text-sm text-foreground-muted">
          You’re about to delete <span className="font-medium">{activeTask?.title}</span>.
        </div>
      </Modal>

      {/* Workspace management */}
      <Modal
        open={Boolean(workspaceModal)}
        title="Delete workspace"
        onClose={() => setWorkspaceModal(null)}
        footer={
          workspaceModal ? (
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setWorkspaceModal(null)}>
                Cancel
              </Button>
              <Button
                className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800"
                onClick={async () => {
                  await deleteWorkspace(workspaceModal.id as any);
                  await qc.invalidateQueries({ queryKey: ["workspaces"] });
                  // If you deleted the active workspace, go to demo (or first available).
                  nav("/w/demo/board");
                  setWorkspaceModal(null);
                }}
              >
                Delete
              </Button>
            </div>
          ) : null
        }
      >
        <div className="text-sm text-foreground-muted">
          This will delete <span className="font-medium">{workspaceModal?.name}</span> and all of its data (groups, lists,
          tasks, placements).
        </div>
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
                    await deleteTaskGroup(groupModal.id);
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
                    const { getUniqueName } = await import("../../utils/nameUtils");
                    const existingNames = groups.map((g: any) => g.title);
                    const finalName = getUniqueName(groupTitleDraft.trim(), existingNames);
                    const description = groupDescDraft.trim().length ? groupDescDraft.trim() : null;
                    try {
                      if (groupModal.mode === "create") {
                        await createTaskGroup({ workspaceId, title: finalName, description });
                      } else {
                        await updateTaskGroup({ id: groupModal.id, title: finalName, description });
                      }
                      await qc.invalidateQueries({ queryKey: ["taskGroups", workspaceId] });
                      setGroupModal(null);
                    } catch (err: any) {
                      alert(`Error saving group: ${err.message}`);
                    }
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
          <div className="text-sm text-foreground-muted">
            Delete group <span className="font-medium">{groupModal.title}</span>? Lists in this group will be deleted.
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Title</div>
              <Input
                className="mt-2"
                autoFocus
                value={groupTitleDraft}
                onChange={(e) => setGroupTitleDraft(e.target.value)}
                placeholder="Group title"
              />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Description (optional)</div>
              <Input
                className="mt-2"
                value={groupDescDraft}
                onChange={(e) => setGroupDescDraft(e.target.value)}
                placeholder="What is this group for?"
              />
            </div>
            {groupModal?.mode === "rename" ? (
              <div className="mt-1 text-xs text-muted-foreground">
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
                    await deleteTaskList(listModal.id);
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
                    const { getUniqueName } = await import("../../utils/nameUtils");
                    const existingNames = lists.map(l => l.title);
                    const finalName = getUniqueName(listTitleDraft.trim(), existingNames);

                    try {
                      if (listModal.mode === "create") {
                        if (!listModal.groupId && ungroupedLists.length >= 3) {
                          toast.error("You cannot have more than 3 ungrouped lists.");
                          return;
                        }
                        await createTaskList({
                          workspaceId,
                          groupId: listModal.groupId,
                          type: listTypeDraft,
                          title: finalName
                        });
                      } else {
                        await updateTaskList({ id: listModal.id, title: listModal.title === finalName ? finalName : finalName });
                      }
                      await qc.invalidateQueries({ queryKey: ["taskLists", workspaceId] });
                      setListModal(null);
                    } catch (err: any) {
                      alert(`Error saving list: ${err.message}`);
                    }
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
          <div className="text-sm text-foreground-muted">
            Delete list <span className="font-medium">{listModal.title}</span>? Placements in this list will be removed.
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Title</div>
              <Input
                className="mt-2"
                autoFocus
                value={listTitleDraft}
                onChange={(e) => setListTitleDraft(e.target.value)}
                placeholder="List title"
              />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Workspace</div>
              <Input
                className="mt-2 bg-background text-muted-foreground cursor-not-allowed"
                disabled
                value={workspaceQ.data?.name ?? workspaceId}
              />
            </div>
            {listModal?.mode === "create" ? (
              <div>
                <div className="text-xs font-medium text-muted-foreground">Type</div>
                <Select className="mt-2" value={listTypeDraft} onChange={(e) => setListTypeDraft(e.target.value as any)}>
                  <option value="person">Person</option>
                  <option value="project">Project</option>
                  <option value="time_slot">Time Slot</option>
                  <option value="other">Other</option>
                </Select>
                <div className="mt-2 text-xs text-muted-foreground">
                  (For MVP, type affects icon/behavior only. We’ll wire richer type-specific settings later.)
                </div>
              </div>
            ) : (
              <div className="mt-1 text-xs text-muted-foreground">
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
      </Modal >

      {/* Unknown @name / (name) during Quick Entry */}
      < Modal
        open={Boolean(unknownMemberModal)}
        title="Add team member?"
        onClose={() => setUnknownMemberModal(null)}
        footer={
          unknownMemberModal ? (
            <div className="flex items-center justify-between gap-2" >
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
                      email: unknownMemberEmailDraft.trim().length ? unknownMemberEmailDraft.trim() : undefined,
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
        <div className="space-y-3 text-sm text-foreground-muted">
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
            <div className="text-xs font-medium text-muted-foreground">Name</div>
            <Input
              className="mt-2"
              value={unknownMemberNameDraft}
              onChange={(e) => setUnknownMemberNameDraft(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Email (optional)</div>
            <Input
              className="mt-2"
              value={unknownMemberEmailDraft}
              onChange={(e) => setUnknownMemberEmailDraft(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-foreground-muted">
            <input
              type="checkbox"
              checked={unknownMemberSendInvite}
              onChange={(e) => setUnknownMemberSendInvite(e.target.checked)}
            />
            Send invite now (requires email)
          </label>
        </div>
      </Modal >

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
        <div className="space-y-3 text-sm text-foreground-muted">
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

function StatPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

// Removed old TaskCard in favor of DraggableTask component
