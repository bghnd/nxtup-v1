import { getDataAdapter } from "./adapter";

// IMPORTANT: do not capture the adapter at module-load time. We switch adapters
// at runtime when the user signs into Supabase (optional auth).
function data() {
  return getDataAdapter();
}

// Convenience re-exports so UI can import stable functions without caring about backend.
export const listWorkspaces = (...args: Parameters<ReturnType<typeof data>["listWorkspaces"]>) =>
  data().listWorkspaces(...args);
export const createWorkspace = (...args: Parameters<ReturnType<typeof data>["createWorkspace"]>) =>
  data().createWorkspace(...args);
export const updateWorkspace = (...args: Parameters<ReturnType<typeof data>["updateWorkspace"]>) =>
  data().updateWorkspace(...args);
export const deleteWorkspace = (...args: Parameters<ReturnType<typeof data>["deleteWorkspace"]>) =>
  data().deleteWorkspace(...args);

export const getWorkspace = (...args: Parameters<ReturnType<typeof data>["getWorkspace"]>) =>
  data().getWorkspace(...args);
export const listProfiles = (...args: Parameters<ReturnType<typeof data>["listProfiles"]>) =>
  data().listProfiles(...args);
export const createMemberPlaceholder = (
  ...args: Parameters<ReturnType<typeof data>["createMemberPlaceholder"]>
) => data().createMemberPlaceholder(...args);
export const listWorkspaceMembers = (
  ...args: Parameters<ReturnType<typeof data>["listWorkspaceMembers"]>
) => data().listWorkspaceMembers(...args);
export const listInvites = (...args: Parameters<ReturnType<typeof data>["listInvites"]>) =>
  data().listInvites(...args);
export const createInvite = (...args: Parameters<ReturnType<typeof data>["createInvite"]>) =>
  data().createInvite(...args);
export const acceptInvite = (...args: Parameters<ReturnType<typeof data>["acceptInvite"]>) =>
  data().acceptInvite(...args);
export const setMemberRole = (...args: Parameters<ReturnType<typeof data>["setMemberRole"]>) =>
  data().setMemberRole(...args);
export const removeMember = (...args: Parameters<ReturnType<typeof data>["removeMember"]>) =>
  data().removeMember(...args);

export const listTasks = (...args: Parameters<ReturnType<typeof data>["listTasks"]>) =>
  data().listTasks(...args);
export const createTask = (...args: Parameters<ReturnType<typeof data>["createTask"]>) =>
  data().createTask(...args);
export const updateTask = (...args: Parameters<ReturnType<typeof data>["updateTask"]>) =>
  data().updateTask(...args);
export const deleteTask = (...args: Parameters<ReturnType<typeof data>["deleteTask"]>) =>
  data().deleteTask(...args);

export const listTaskGroups = (...args: Parameters<ReturnType<typeof data>["listTaskGroups"]>) =>
  data().listTaskGroups(...args);
export const createTaskGroup = (...args: Parameters<ReturnType<typeof data>["createTaskGroup"]>) =>
  data().createTaskGroup(...args);
export const updateTaskGroup = (...args: Parameters<ReturnType<typeof data>["updateTaskGroup"]>) =>
  data().updateTaskGroup(...args);
export const deleteTaskGroup = (...args: Parameters<ReturnType<typeof data>["deleteTaskGroup"]>) =>
  data().deleteTaskGroup(...args);
export const listTaskLists = (...args: Parameters<ReturnType<typeof data>["listTaskLists"]>) =>
  data().listTaskLists(...args);
export const createTaskList = (...args: Parameters<ReturnType<typeof data>["createTaskList"]>) =>
  data().createTaskList(...args);
export const updateTaskList = (...args: Parameters<ReturnType<typeof data>["updateTaskList"]>) =>
  data().updateTaskList(...args);
export const deleteTaskList = (...args: Parameters<ReturnType<typeof data>["deleteTaskList"]>) =>
  data().deleteTaskList(...args);
export const listTaskPlacements = (
  ...args: Parameters<ReturnType<typeof data>["listTaskPlacements"]>
) => data().listTaskPlacements(...args);
export const createTaskPlacement = (
  ...args: Parameters<ReturnType<typeof data>["createTaskPlacement"]>
) => data().createTaskPlacement(...args);
export const updateTaskPlacement = (
  ...args: Parameters<ReturnType<typeof data>["updateTaskPlacement"]>
) => data().updateTaskPlacement(...args);
export const deleteTaskPlacement = (
  ...args: Parameters<ReturnType<typeof data>["deleteTaskPlacement"]>
) => data().deleteTaskPlacement(...args);
export const deleteTaskPlacementByTaskAndList = (
  ...args: Parameters<ReturnType<typeof data>["deleteTaskPlacementByTaskAndList"]>
) => data().deleteTaskPlacementByTaskAndList(...args);

export const listTaskParticipants = (
  ...args: Parameters<ReturnType<typeof data>["listTaskParticipants"]>
) => data().listTaskParticipants(...args);
export const upsertTaskParticipant = (
  ...args: Parameters<ReturnType<typeof data>["upsertTaskParticipant"]>
) => data().upsertTaskParticipant(...args);
export const removeTaskParticipant = (
  ...args: Parameters<ReturnType<typeof data>["removeTaskParticipant"]>
) => data().removeTaskParticipant(...args);


