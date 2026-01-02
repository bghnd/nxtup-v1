import type {
  CreateInviteInput,
  CreateTaskInput,
  UpdateTaskInput,
  WorkspaceMemberRow
} from "../api";
import type { Invite, Profile, Task, Workspace, WorkspaceId } from "../../domain/types";

export type DataAdapter = {
  getWorkspace: (workspaceId: WorkspaceId) => Promise<Workspace>;
  listProfiles: (workspaceId: WorkspaceId) => Promise<Profile[]>;
  listWorkspaceMembers: (workspaceId: WorkspaceId) => Promise<WorkspaceMemberRow[]>;
  listInvites: (workspaceId: WorkspaceId) => Promise<Invite[]>;
  createInvite: (input: CreateInviteInput) => Promise<Invite>;
  acceptInvite: (input: { token: string; acceptAsProfileId: string }) => Promise<void>;
  listTasks: (workspaceId: WorkspaceId) => Promise<Task[]>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (input: UpdateTaskInput) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
};




