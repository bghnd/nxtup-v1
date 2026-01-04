import type {
  CreateTaskPlacementInput,
  CreateInviteInput,
  CreateTaskInput,
  UpdateTaskInput,
  WorkspaceMemberRow
} from "../api";
import type {
  Invite,
  Profile,
  ProfileId,
  Task,
  TaskId,
  TaskGroup,
  TaskList,
  TaskPlacement,
  TaskParticipant,
  TaskParticipantRole,
  Workspace,
  WorkspaceId
} from "../../domain/types";
import type { WorkspaceRole } from "../../domain/types";

export type DataAdapter = {
  listWorkspaces: () => Promise<Workspace[]>;
  createWorkspace: (input: { name: string }) => Promise<Workspace>;
  updateWorkspace: (input: { id: WorkspaceId; name: string }) => Promise<Workspace>;
  deleteWorkspace: (input: { id: WorkspaceId }) => Promise<void>;
  getWorkspace: (workspaceId: WorkspaceId) => Promise<Workspace>;
  listProfiles: (workspaceId: WorkspaceId) => Promise<Profile[]>;
  createMemberPlaceholder: (input: {
    workspaceId: WorkspaceId;
    name: string;
    email?: string | null;
    role?: WorkspaceRole;
    status?: "active" | "invited";
  }) => Promise<Profile>;
  listWorkspaceMembers: (workspaceId: WorkspaceId) => Promise<WorkspaceMemberRow[]>;
  listInvites: (workspaceId: WorkspaceId) => Promise<Invite[]>;
  createInvite: (input: CreateInviteInput) => Promise<Invite>;
  acceptInvite: (input: { token: string; acceptAsProfileId: string }) => Promise<void>;
  setMemberRole: (input: { workspaceId: WorkspaceId; profileId: ProfileId; role: WorkspaceRole }) => Promise<void>;
  removeMember: (input: { workspaceId: WorkspaceId; profileId: ProfileId }) => Promise<void>;
  listTasks: (workspaceId: WorkspaceId) => Promise<Task[]>;
  listTaskGroups: (workspaceId: WorkspaceId) => Promise<TaskGroup[]>;
  createTaskGroup: (input: { workspaceId: WorkspaceId; title: string; description?: string | null }) => Promise<TaskGroup>;
  updateTaskGroup: (input: {
    id: string;
    title?: string;
    description?: string | null;
    sortOrder?: number;
  }) => Promise<TaskGroup>;
  deleteTaskGroup: (input: { id: string }) => Promise<void>;
  listTaskLists: (workspaceId: WorkspaceId) => Promise<TaskList[]>;
  createTaskList: (input: {
    workspaceId: WorkspaceId;
    groupId: string | null;
    type: TaskList["type"];
    refId?: string | null;
    title: string;
  }) => Promise<TaskList>;
  updateTaskList: (input: {
    id: string;
    groupId?: string | null;
    title?: string;
    sortOrder?: number;
  }) => Promise<TaskList>;
  deleteTaskList: (input: { id: string }) => Promise<void>;
  listTaskPlacements: (workspaceId: WorkspaceId) => Promise<TaskPlacement[]>;
  createTaskPlacement: (input: CreateTaskPlacementInput) => Promise<TaskPlacement>;
  updateTaskPlacement: (input: {
    id: string;
    position?: number;
    listId?: string;
  }) => Promise<TaskPlacement>;
  deleteTaskPlacement: (id: string) => Promise<void>;
  deleteTaskPlacementByTaskAndList: (input: {
    workspaceId: WorkspaceId;
    taskId: string;
    listId: string;
  }) => Promise<void>;
  listTaskParticipants: (workspaceId: WorkspaceId) => Promise<TaskParticipant[]>;
  upsertTaskParticipant: (input: {
    workspaceId: WorkspaceId;
    taskId: TaskId;
    profileId: ProfileId;
    role: TaskParticipantRole;
    createdBy: ProfileId;
  }) => Promise<TaskParticipant>;
  removeTaskParticipant: (input: { workspaceId: WorkspaceId; taskId: TaskId; profileId: ProfileId }) => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (input: UpdateTaskInput) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
};




