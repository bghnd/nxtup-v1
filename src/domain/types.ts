export type WorkspaceId = string;
export type ProfileId = string;
export type TaskId = string;
export type TaskGroupId = string;
export type TaskListId = string;
export type TaskPlacementId = string;

export type WorkspaceRole = "owner" | "admin" | "member";

export type Priority = "low" | "medium" | "high" | "critical";

export type TaskLocation = "inbox" | "board";

export type TaskListType = "inbox" | "person" | "project" | "time_slot" | "calendar_event" | "other";

export type Profile = {
  id: ProfileId;
  name: string;
  email: string | null;
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
  /**
   * Legacy MVP field (single-location). Once we fully move to task placements,
   * UI should derive location from placements instead of relying on this.
   */
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

export type TaskGroup = {
  id: TaskGroupId;
  workspaceId: WorkspaceId;
  title: string;
  description?: string | null;
  sortOrder: number;
};

export type TaskList = {
  id: TaskListId;
  workspaceId: WorkspaceId;
  /**
   * Null for non-board lists (e.g. Inbox lives in the L2 context panel, not the board stack).
   */
  groupId: TaskGroupId | null;
  type: TaskListType;
  /**
   * Optional foreign reference depending on type (e.g. person list may reference a ProfileId).
   */
  refId?: string | null;
  title: string;
  sortOrder: number;
};

export type TaskPlacement = {
  id: TaskPlacementId;
  workspaceId: WorkspaceId;
  taskId: TaskId;
  listId: TaskListId;
  /**
   * Lower numbers appear higher in the list. (Manual ordering foundation)
   */
  position: number;
  createdBy: ProfileId;
  createdAt: string; // ISO
};

export type TaskParticipantRole = "watcher" | "tracker";

export type TaskParticipant = {
  workspaceId: WorkspaceId;
  taskId: TaskId;
  profileId: ProfileId;
  role: TaskParticipantRole;
  createdBy: ProfileId;
  createdAt: string; // ISO
};


