import type {
  CreateTaskPlacementInput,
  CreateInviteInput,
  CreateTaskGroupInput,
  CreateTaskInput,
  CreateTaskListInput,
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
  WorkspaceId,
  TaskParticipant,
  TaskParticipantRole,
  WorkspaceRole
} from "../../domain/types";

export type DataAdapter = {
  listWorkspaces: () => Promise<Workspace[]>;
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
  createTaskGroup: (input: CreateTaskGroupInput) => Promise<TaskGroup>;
  createTaskList: (input: CreateTaskListInput) => Promise<TaskList>;
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
  createWorkspace: (input: { name: string }) => Promise<Workspace>;
  updateWorkspace: (input: { id: WorkspaceId; name?: string; description?: string | null }) => Promise<Workspace>;
  deleteWorkspace: (id: WorkspaceId) => Promise<void>;
  updateTaskGroup: (input: { id: string; title?: string; description?: string | null }) => Promise<TaskGroup>;
  deleteTaskGroup: (id: string) => Promise<void>;
  updateTaskList: (input: { id: string; title?: string; description?: string | null; groupId?: string | null }) => Promise<TaskList>;
  deleteTaskList: (id: string) => Promise<void>;
  listTaskParticipants: (workspaceId: WorkspaceId) => Promise<TaskParticipant[]>;
  upsertTaskParticipant: (input: { workspaceId: WorkspaceId; taskId: string; profileId: string; role: TaskParticipantRole; createdBy: string; }) => Promise<TaskParticipant>;
  removeTaskParticipant: (input: { workspaceId: WorkspaceId; taskId: string; profileId: string; }) => Promise<void>;
  createMemberPlaceholder: (input: { workspaceId: WorkspaceId; name: string; email?: string; status?: string; role?: string; }) => Promise<Profile>;
  setMemberRole: (input: { workspaceId: WorkspaceId; profileId: string; role: WorkspaceRole; }) => Promise<void>;
  getLastEntry: (workspaceId: WorkspaceId) => Promise<Task | null>;
  duplicateTask: (workspaceId: WorkspaceId, taskId: string, createdBy: string) => Promise<Task>;
};




