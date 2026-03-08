import type {
  Invite,
  Priority,
  Profile,
  ProfileId,
  Task,
  TaskId,
  TaskLocation,
  TaskGroup,
  TaskList,
  TaskListId,
  TaskPlacement,
  TaskPlacementId,
  Workspace,
  WorkspaceId,
  WorkspaceMember,
  WorkspaceRole
} from "../domain/types";
import {
  demoInvites,
  demoMembers,
  demoProfiles,
  demoTaskGroups,
  demoTaskLists,
  demoTaskPlacements,
  demoTasks,
  demoWorkspace
} from "./mockDb";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// In-memory DB (stub mode). Later swapped for Supabase adapter.
let profilesDb: Profile[] = [...demoProfiles];
let tasksDb: Task[] = [...demoTasks];
let taskGroupsDb: TaskGroup[] = [...demoTaskGroups];
let taskListsDb: TaskList[] = [...demoTaskLists];
let taskPlacementsDb: TaskPlacement[] = [...demoTaskPlacements];
let membersDb: WorkspaceMember[] = [...demoMembers];
let invitesDb: Invite[] = [...demoInvites];

export async function getWorkspace(workspaceId: WorkspaceId): Promise<Workspace> {
  await sleep(80);
  if (workspaceId !== demoWorkspace.id) return demoWorkspace;
  return demoWorkspace;
}

export async function listProfiles(workspaceId: WorkspaceId): Promise<Profile[]> {
  await sleep(80);
  void workspaceId;
  return profilesDb;
}

export type WorkspaceMemberRow = {
  profile: Profile;
  role: WorkspaceRole;
  status: WorkspaceMember["status"];
};

export async function listWorkspaceMembers(workspaceId: WorkspaceId): Promise<WorkspaceMemberRow[]> {
  await sleep(100);
  return membersDb
    .filter((m) => m.workspaceId === workspaceId && m.status !== "removed")
    .map((m) => ({
      profile: profilesDb.find((p) => p.id === m.profileId)!,
      role: m.role,
      status: m.status
    }))
    .filter((r) => Boolean(r.profile));
}

export async function listTasks(workspaceId: WorkspaceId): Promise<Task[]> {
  await sleep(120);
  return tasksDb.filter((t) => t.workspaceId === workspaceId);
}

export async function listGlobalTasks(): Promise<Task[]> {
  await sleep(120);
  return tasksDb; // For mock DB, assume all tasks belong to the current session user
}

export async function listTaskGroups(workspaceId: WorkspaceId): Promise<TaskGroup[]> {
  await sleep(80);
  return taskGroupsDb
    .filter((g) => g.workspaceId === workspaceId)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listTaskLists(workspaceId: WorkspaceId): Promise<TaskList[]> {
  await sleep(80);
  return taskListsDb
    .filter((l) => l.workspaceId === workspaceId)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listTaskPlacements(workspaceId: WorkspaceId): Promise<TaskPlacement[]> {
  await sleep(80);
  return taskPlacementsDb.filter((p) => p.workspaceId === workspaceId);
}

export type CreateTaskPlacementInput = {
  workspaceId: WorkspaceId;
  taskId: TaskId;
  listId: TaskListId;
  createdBy: ProfileId;
  position?: number;
};

/**
 * Idempotent “upsert”: if the task is already placed in the list, returns the existing placement.
 */
export async function createTaskPlacement(input: CreateTaskPlacementInput): Promise<TaskPlacement> {
  await sleep(90);
  const existing = taskPlacementsDb.find(
    (p) => p.workspaceId === input.workspaceId && p.taskId === input.taskId && p.listId === input.listId
  );
  if (existing) return existing;

  const fallbackPosition = (() => {
    const positions = taskPlacementsDb
      .filter((p) => p.workspaceId === input.workspaceId && p.listId === input.listId)
      .map((p) => p.position);
    const max = positions.length ? Math.max(...positions) : 0;
    return max + 100;
  })();

  const id: TaskPlacementId = `pl_${Math.random().toString(36).slice(2, 10)}`;
  const placement: TaskPlacement = {
    id,
    workspaceId: input.workspaceId,
    taskId: input.taskId,
    listId: input.listId,
    position: input.position ?? fallbackPosition,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString()
  };
  taskPlacementsDb = [...taskPlacementsDb, placement];
  return placement;
}

export async function updateTaskPlacement(input: {
  id: TaskPlacementId;
  position?: number;
  listId?: TaskListId;
}): Promise<TaskPlacement> {
  await sleep(90);
  const idx = taskPlacementsDb.findIndex((p) => p.id === input.id);
  if (idx < 0) throw new Error("Placement not found");
  const prev = taskPlacementsDb[idx]!;
  const next: TaskPlacement = {
    ...prev,
    position: input.position ?? prev.position,
    listId: input.listId ?? prev.listId
  };
  taskPlacementsDb = [...taskPlacementsDb.slice(0, idx), next, ...taskPlacementsDb.slice(idx + 1)];
  return next;
}

export async function deleteTaskPlacement(id: TaskPlacementId): Promise<void> {
  await sleep(60);
  taskPlacementsDb = taskPlacementsDb.filter((p) => p.id !== id);
}

export async function deleteTaskPlacementByTaskAndList(input: {
  workspaceId: WorkspaceId;
  taskId: TaskId;
  listId: TaskListId;
}): Promise<void> {
  await sleep(60);
  taskPlacementsDb = taskPlacementsDb.filter(
    (p) => !(p.workspaceId === input.workspaceId && p.taskId === input.taskId && p.listId === input.listId)
  );
}

export type CreateTaskInput = {
  workspaceId: WorkspaceId;
  createdBy: ProfileId;
  title: string;
  priority: Priority;
  location: TaskLocation;
  groupId?: string | null;
  dueDate?: string;
  assigneeId?: ProfileId | null;
  tags?: string[];
  status?: "active" | "done";
};

export async function createTask(input: CreateTaskInput): Promise<Task> {
  await sleep(120);
  const now = new Date().toISOString();
  const id: TaskId = `t_${Math.random().toString(36).slice(2, 10)}`;
  const task: Task = {
    id,
    workspaceId: input.workspaceId,
    location: input.location,
    groupId: input.groupId ?? null,
    title: input.title.trim() || "Untitled task",
    priority: input.priority,
    dueDate: input.dueDate,
    assigneeId: input.assigneeId ?? null,
    createdBy: input.createdBy,
    updatedAt: now,
    checklist: { total: 0, done: 0 },
    commentsCount: 0,
    tags: input.tags ?? [],
    status: input.status ?? "active"
  };
  tasksDb = [task, ...tasksDb];
  return task;
}

export type UpdateTaskInput = {
  id: TaskId;
  location?: TaskLocation;
  groupId?: string | null;
  title?: string;
  priority?: Priority;
  dueDate?: string | null;
  assigneeId?: ProfileId | null;
  tags?: string[];
  status?: "active" | "done";
};

export async function updateTask(input: UpdateTaskInput): Promise<Task> {
  await sleep(120);
  const idx = tasksDb.findIndex((t) => t.id === input.id);
  if (idx < 0) throw new Error("Task not found");
  const prev = tasksDb[idx]!;
  const next: Task = {
    ...prev,
    location: input.location ?? prev.location,
    groupId: input.groupId !== undefined ? input.groupId : prev.groupId,
    title: input.title !== undefined ? input.title : prev.title,
    priority: input.priority ?? prev.priority,
    dueDate:
      input.dueDate === undefined ? prev.dueDate : input.dueDate === null ? undefined : input.dueDate,
    assigneeId: input.assigneeId === undefined ? prev.assigneeId : input.assigneeId,
    tags: input.tags ?? prev.tags,
    status: input.status ?? prev.status,
    updatedAt: new Date().toISOString()
  };
  tasksDb = [...tasksDb.slice(0, idx), next, ...tasksDb.slice(idx + 1)];
  return next;
}

export async function deleteTask(id: TaskId): Promise<void> {
  await sleep(80);
  tasksDb = tasksDb.filter((t) => t.id !== id);
}

export async function getLastEntry(workspaceId: WorkspaceId): Promise<Task | null> {
  await sleep(80);
  const workspaceTasks = tasksDb.filter((t) => t.workspaceId === workspaceId);
  if (workspaceTasks.length === 0) return null;
  // Sort by updatedAt descending
  return workspaceTasks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
}

export async function duplicateTask(workspaceId: WorkspaceId, taskId: TaskId, createdBy: ProfileId): Promise<Task> {
  await sleep(150);
  const original = tasksDb.find((t) => t.id === taskId && t.workspaceId === workspaceId);
  if (!original) throw new Error("Task not found");

  const newId: TaskId = `t_${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date().toISOString();

  const duplicatedTask: Task = {
    ...original,
    id: newId,
    createdBy,
    updatedAt: now,
  };

  tasksDb = [duplicatedTask, ...tasksDb];

  // Duplicate placements
  const placements = taskPlacementsDb.filter((p) => p.taskId === taskId && p.workspaceId === workspaceId);
  for (const placement of placements) {
    const newPlacementId: TaskPlacementId = `pl_${Math.random().toString(36).slice(2, 10)}`;
    taskPlacementsDb = [
      ...taskPlacementsDb,
      {
        ...placement,
        id: newPlacementId,
        taskId: newId,
        createdBy,
        createdAt: now,
      }
    ];
  }

  // Duplicate participants
  const participants = taskParticipantsDb.filter((p) => p.taskId === taskId && p.workspaceId === workspaceId);
  for (const participant of participants) {
    const newParticipantId = `tp_${Math.random().toString(36).slice(2, 10)}`;
    taskParticipantsDb = [
      ...taskParticipantsDb,
      {
        ...participant,
        id: newParticipantId,
        taskId: newId,
        createdBy,
        createdAt: now,
      }
    ];
  }

  return duplicatedTask;
}

export type CreateInviteInput = {
  workspaceId: WorkspaceId;
  email: string;
  role: WorkspaceRole;
  createdBy: ProfileId;
};

export async function listInvites(workspaceId: WorkspaceId): Promise<Invite[]> {
  await sleep(100);
  return invitesDb
    .filter((i) => i.workspaceId === workspaceId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createInvite(input: CreateInviteInput): Promise<Invite> {
  await sleep(160);
  const token = `inv_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const invite: Invite = {
    id: `i_${Math.random().toString(36).slice(2, 10)}`,
    workspaceId: input.workspaceId,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    acceptedAt: null,
    createdBy: input.createdBy,
    createdAt: now
  };
  invitesDb = [invite, ...invitesDb];
  // Represent invite in members as invited placeholder (no profile yet)
  return invite;
}

export async function acceptInvite(input: {
  token: string;
  acceptAsProfileId: ProfileId;
}): Promise<void> {
  await sleep(180);
  const idx = invitesDb.findIndex((i) => i.token === input.token);
  if (idx < 0) throw new Error("Invite not found");
  const invite = invitesDb[idx]!;
  invitesDb = [
    { ...invite, acceptedAt: new Date().toISOString() },
    ...invitesDb.slice(0, idx),
    ...invitesDb.slice(idx + 1)
  ];

  const exists = membersDb.some(
    (m) => m.workspaceId === invite.workspaceId && m.profileId === input.acceptAsProfileId
  );
  if (!exists) {
    membersDb = [
      ...membersDb,
      {
        workspaceId: invite.workspaceId,
        profileId: input.acceptAsProfileId,
        role: invite.role,
        status: "active"
      }
    ];
  }
}

export async function setMemberRole(input: {
  workspaceId: WorkspaceId;
  profileId: ProfileId;
  role: WorkspaceRole;
}): Promise<void> {
  await sleep(120);
  membersDb = membersDb.map((m) =>
    m.workspaceId === input.workspaceId && m.profileId === input.profileId ? { ...m, role: input.role } : m
  );
}

export async function removeMember(input: {
  workspaceId: WorkspaceId;
  profileId: ProfileId;
}): Promise<void> {
  await sleep(120);
  membersDb = membersDb.map((m) =>
    m.workspaceId === input.workspaceId && m.profileId === input.profileId ? { ...m, status: "removed" } : m
  );
}

export function __dangerousResetMockDb() {
  profilesDb = [...demoProfiles];
  tasksDb = [...demoTasks];
  taskGroupsDb = [...demoTaskGroups];
  taskListsDb = [...demoTaskLists];
  taskPlacementsDb = [...demoTaskPlacements];
  membersDb = [...demoMembers];
  invitesDb = [...demoInvites];
  workspacesDb = [{ ...demoWorkspace }];
  taskParticipantsDb = [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Workspaces
// ─────────────────────────────────────────────────────────────────────────────

let workspacesDb: Workspace[] = [{ ...demoWorkspace }];

export async function listWorkspaces(): Promise<Workspace[]> {
  await sleep(80);
  return workspacesDb;
}

export async function createWorkspace(input: { name: string }): Promise<Workspace> {
  await sleep(120);
  const id = `ws_${Math.random().toString(36).slice(2, 10)}`;
  const ws: Workspace = {
    id,
    name: input.name.trim() || "Untitled Workspace",
    createdBy: "p_alice" // Mock: default to Alice
  };
  workspacesDb = [...workspacesDb, ws];
  return ws;
}

export async function updateWorkspace(input: {
  id: WorkspaceId;
  name?: string;
  description?: string | null;
}): Promise<Workspace> {
  await sleep(100);
  const idx = workspacesDb.findIndex((w) => w.id === input.id);
  if (idx < 0) throw new Error("Workspace not found");
  const prev = workspacesDb[idx]!;
  const next: Workspace = {
    ...prev,
    name: input.name !== undefined ? input.name : prev.name,
    description: input.description !== undefined ? input.description : prev.description
  };
  workspacesDb = [...workspacesDb.slice(0, idx), next, ...workspacesDb.slice(idx + 1)];
  return next;
}

export async function deleteWorkspace(id: WorkspaceId): Promise<void> {
  await sleep(100);
  workspacesDb = workspacesDb.filter((w) => w.id !== id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Groups
// ─────────────────────────────────────────────────────────────────────────────

export type CreateTaskGroupInput = {
  workspaceId: WorkspaceId;
  title: string;
  description?: string | null;
  sortOrder?: number;
};

export async function createTaskGroup(input: CreateTaskGroupInput): Promise<TaskGroup> {
  await sleep(100);
  const id = `g_${Math.random().toString(36).slice(2, 10)}`;
  const maxSort = Math.max(0, ...taskGroupsDb.map((g) => g.sortOrder));
  const group: TaskGroup = {
    id,
    workspaceId: input.workspaceId,
    title: input.title.trim() || "Untitled Group",
    description: input.description ?? null,
    sortOrder: input.sortOrder ?? maxSort + 100
  };
  taskGroupsDb = [...taskGroupsDb, group];
  return group;
}

export async function updateTaskGroup(input: {
  id: string;
  title?: string;
  description?: string | null;
}): Promise<TaskGroup> {
  await sleep(100);
  const idx = taskGroupsDb.findIndex((g) => g.id === input.id);
  if (idx < 0) throw new Error("TaskGroup not found");
  const prev = taskGroupsDb[idx]!;
  const next: TaskGroup = {
    ...prev,
    title: input.title !== undefined ? input.title : prev.title,
    description: input.description !== undefined ? input.description : prev.description
  };
  taskGroupsDb = [...taskGroupsDb.slice(0, idx), next, ...taskGroupsDb.slice(idx + 1)];
  return next;
}

export async function deleteTaskGroup(id: string): Promise<void> {
  await sleep(80);
  taskGroupsDb = taskGroupsDb.filter((g) => g.id !== id);
  // Also orphan any lists that belonged to this group
  taskListsDb = taskListsDb.map((l) => (l.groupId === id ? { ...l, groupId: null } : l));
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Lists
// ─────────────────────────────────────────────────────────────────────────────

export type CreateTaskListInput = {
  workspaceId: WorkspaceId;
  groupId: string | null;
  type: TaskList["type"];
  title: string;
  description?: string | null;
  refId?: string | null;
};

export async function createTaskList(input: CreateTaskListInput): Promise<TaskList> {
  await sleep(100);
  const id = `l_${Math.random().toString(36).slice(2, 10)}`;
  const maxSort = Math.max(0, ...taskListsDb.map((l) => l.sortOrder));
  const list: TaskList = {
    id,
    workspaceId: input.workspaceId,
    groupId: input.groupId,
    type: input.type,
    refId: input.refId ?? null,
    title: input.title.trim() || "Untitled List",
    description: input.description ?? undefined,
    sortOrder: maxSort + 100
  };
  taskListsDb = [...taskListsDb, list];
  return list;
}

export async function updateTaskList(input: {
  id: string;
  title?: string;
  description?: string | null;
  groupId?: string | null;
}): Promise<TaskList> {
  await sleep(100);
  const idx = taskListsDb.findIndex((l) => l.id === input.id);
  if (idx < 0) throw new Error("TaskList not found");
  const prev = taskListsDb[idx]!;
  const next: TaskList = {
    ...prev,
    title: input.title !== undefined ? input.title : prev.title,
    description: input.description !== undefined ? (input.description ?? undefined) : prev.description,
    groupId: input.groupId !== undefined ? input.groupId : prev.groupId
  };
  taskListsDb = [...taskListsDb.slice(0, idx), next, ...taskListsDb.slice(idx + 1)];
  return next;
}

export async function deleteTaskList(id: string): Promise<void> {
  await sleep(80);
  taskListsDb = taskListsDb.filter((l) => l.id !== id);
  // Also remove placements pointing to this list
  taskPlacementsDb = taskPlacementsDb.filter((p) => p.listId !== id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Participants
// ─────────────────────────────────────────────────────────────────────────────

import type { TaskParticipant, TaskParticipantRole } from "../domain/types";

let taskParticipantsDb: TaskParticipant[] = [];

export async function listTaskParticipants(workspaceId: WorkspaceId): Promise<TaskParticipant[]> {
  await sleep(80);
  return taskParticipantsDb.filter((p) => p.workspaceId === workspaceId);
}

export async function upsertTaskParticipant(input: {
  workspaceId: WorkspaceId;
  taskId: string;
  profileId: string;
  role: TaskParticipantRole;
  createdBy: string;
}): Promise<TaskParticipant> {
  await sleep(90);
  const existingIdx = taskParticipantsDb.findIndex(
    (p) => p.workspaceId === input.workspaceId && p.taskId === input.taskId && p.profileId === input.profileId
  );
  if (existingIdx >= 0) {
    // Update role
    const prev = taskParticipantsDb[existingIdx]!;
    const next: TaskParticipant = { ...prev, role: input.role };
    taskParticipantsDb = [
      ...taskParticipantsDb.slice(0, existingIdx),
      next,
      ...taskParticipantsDb.slice(existingIdx + 1)
    ];
    return next;
  }
  const id = `tp_${Math.random().toString(36).slice(2, 10)}`;
  const participant: TaskParticipant = {
    id,
    workspaceId: input.workspaceId,
    taskId: input.taskId,
    profileId: input.profileId,
    role: input.role,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString()
  };
  taskParticipantsDb = [...taskParticipantsDb, participant];
  return participant;
}

export async function removeTaskParticipant(input: {
  workspaceId: WorkspaceId;
  taskId: string;
  profileId: string;
}): Promise<void> {
  await sleep(80);
  taskParticipantsDb = taskParticipantsDb.filter(
    (p) => !(p.workspaceId === input.workspaceId && p.taskId === input.taskId && p.profileId === input.profileId)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Member Placeholder (for inviting unknown users via quick entry)
// ─────────────────────────────────────────────────────────────────────────────

export async function createMemberPlaceholder(input: {
  workspaceId: WorkspaceId;
  name: string;
  email?: string;
  status?: string;
  role?: string;
}): Promise<Profile> {
  await sleep(120);
  const id = `p_${Math.random().toString(36).slice(2, 10)}`;
  const profile: Profile = {
    id,
    name: input.name.trim() || "Unknown",
    email: input.email?.trim() || `placeholder-${id}@nxtup.dev`,
    avatarUrl: null
  };
  profilesDb = [...profilesDb, profile];
  // Also add as member
  membersDb = [
    ...membersDb,
    {
      workspaceId: input.workspaceId,
      profileId: id,
      role: "member",
      status: "invited"
    }
  ];
  return profile;
}



