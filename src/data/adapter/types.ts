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
  Task,
  TaskGroup,
  TaskList,
  TaskPlacement,
  Workspace,
  WorkspaceId
} from "../../domain/types";

export type DataAdapter = {
  getWorkspace: (workspaceId: WorkspaceId) => Promise<Workspace>;
  listProfiles: (workspaceId: WorkspaceId) => Promise<Profile[]>;
  listWorkspaceMembers: (workspaceId: WorkspaceId) => Promise<WorkspaceMemberRow[]>;
  listInvites: (workspaceId: WorkspaceId) => Promise<Invite[]>;
  createInvite: (input: CreateInviteInput) => Promise<Invite>;
  acceptInvite: (input: { token: string; acceptAsProfileId: string }) => Promise<void>;
  listTasks: (workspaceId: WorkspaceId) => Promise<Task[]>;
  listTaskGroups: (workspaceId: WorkspaceId) => Promise<TaskGroup[]>;
  listTaskLists: (workspaceId: WorkspaceId) => Promise<TaskList[]>;
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
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (input: UpdateTaskInput) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
};




