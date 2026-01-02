export type WorkspaceId = string;
export type ProfileId = string;
export type TaskId = string;

export type WorkspaceRole = "owner" | "admin" | "member";

export type Priority = "low" | "medium" | "high" | "critical";

export type TaskLocation = "inbox" | "board";

export type Profile = {
  id: ProfileId;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export type Workspace = {
  id: WorkspaceId;
  name: string;
  createdBy: ProfileId;
};

export type WorkspaceMember = {
  workspaceId: WorkspaceId;
  profileId: ProfileId;
  role: WorkspaceRole;
  status: "active" | "invited" | "removed";
};

export type Invite = {
  id: string;
  workspaceId: WorkspaceId;
  email: string;
  role: WorkspaceRole;
  token: string;
  expiresAt: string; // ISO
  acceptedAt?: string | null; // ISO
  createdBy: ProfileId;
  createdAt: string; // ISO
};

export type Task = {
  id: TaskId;
  workspaceId: WorkspaceId;
  location: TaskLocation;
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: string; // YYYY-MM-DD
  assigneeId: ProfileId | null;
  createdBy: ProfileId;
  updatedAt: string; // ISO
  checklist: { total: number; done: number };
  commentsCount: number;
  tags: string[];
};


