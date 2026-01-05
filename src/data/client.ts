import { getDataAdapter } from "./adapter";

export const data = getDataAdapter();

// Convenience re-exports so UI can import stable functions without caring about backend.
export const getWorkspace = data.getWorkspace;
export const listProfiles = data.listProfiles;
export const listWorkspaceMembers = data.listWorkspaceMembers;
export const listInvites = data.listInvites;
export const createInvite = data.createInvite;
export const acceptInvite = data.acceptInvite;

export const listTasks = data.listTasks;
export const createTask = data.createTask;
export const updateTask = data.updateTask;
export const deleteTask = data.deleteTask;

export const listTaskGroups = data.listTaskGroups;
export const listTaskLists = data.listTaskLists;
export const listTaskPlacements = data.listTaskPlacements;
export const createTaskPlacement = data.createTaskPlacement;
export const updateTaskPlacement = data.updateTaskPlacement;
export const deleteTaskPlacement = data.deleteTaskPlacement;
export const deleteTaskPlacementByTaskAndList = data.deleteTaskPlacementByTaskAndList;


