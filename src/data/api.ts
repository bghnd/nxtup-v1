import type {
  Invite,
  Priority,
  Profile,
  ProfileId,
  Task,
  TaskId,
  TaskLocation,
  Workspace,
  WorkspaceId,
  WorkspaceMember,
  WorkspaceRole
} from "../domain/types";
import { demoInvites, demoMembers, demoProfiles, demoTasks, demoWorkspace } from "./mockDb";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// In-memory DB (stub mode). Later swapped for Supabase adapter.
let profilesDb: Profile[] = [...demoProfiles];
let tasksDb: Task[] = [...demoTasks];
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

export type CreateTaskInput = {
  workspaceId: WorkspaceId;
  createdBy: ProfileId;
  title: string;
  priority: Priority;
  location: TaskLocation;
  dueDate?: string;
  assigneeId?: ProfileId | null;
  tags?: string[];
};

export async function createTask(input: CreateTaskInput): Promise<Task> {
  await sleep(120);
  const now = new Date().toISOString();
  const id: TaskId = `t_${Math.random().toString(36).slice(2, 10)}`;
  const task: Task = {
    id,
    workspaceId: input.workspaceId,
    location: input.location,
    title: input.title.trim() || "Untitled task",
    priority: input.priority,
    dueDate: input.dueDate,
    assigneeId: input.assigneeId ?? null,
    createdBy: input.createdBy,
    updatedAt: now,
    checklist: { total: 0, done: 0 },
    commentsCount: 0,
    tags: input.tags ?? []
  };
  tasksDb = [task, ...tasksDb];
  return task;
}

export type UpdateTaskInput = {
  id: TaskId;
  location?: TaskLocation;
  title?: string;
  priority?: Priority;
  dueDate?: string | null;
  assigneeId?: ProfileId | null;
  tags?: string[];
};

export async function updateTask(input: UpdateTaskInput): Promise<Task> {
  await sleep(120);
  const idx = tasksDb.findIndex((t) => t.id === input.id);
  if (idx < 0) throw new Error("Task not found");
  const prev = tasksDb[idx]!;
  const next: Task = {
    ...prev,
    location: input.location ?? prev.location,
    title: input.title !== undefined ? input.title : prev.title,
    priority: input.priority ?? prev.priority,
    dueDate:
      input.dueDate === undefined ? prev.dueDate : input.dueDate === null ? undefined : input.dueDate,
    assigneeId: input.assigneeId === undefined ? prev.assigneeId : input.assigneeId,
    tags: input.tags ?? prev.tags,
    updatedAt: new Date().toISOString()
  };
  tasksDb = [...tasksDb.slice(0, idx), next, ...tasksDb.slice(idx + 1)];
  return next;
}

export async function deleteTask(id: TaskId): Promise<void> {
  await sleep(80);
  tasksDb = tasksDb.filter((t) => t.id !== id);
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
  membersDb = [...demoMembers];
  invitesDb = [...demoInvites];
}


