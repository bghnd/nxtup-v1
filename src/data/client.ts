import { getDataAdapter } from "./adapter";

// No direct api.ts imports are needed anymore since everything routes through the adapter!
export const listWorkspaces = () => getDataAdapter().listWorkspaces();
export const getWorkspace = (workspaceId: any) => getDataAdapter().getWorkspace(workspaceId);
export const listProfiles = (workspaceId: any) => getDataAdapter().listProfiles(workspaceId);
export const listWorkspaceMembers = (workspaceId: any) => getDataAdapter().listWorkspaceMembers(workspaceId);
export const listInvites = (workspaceId: any) => getDataAdapter().listInvites(workspaceId);
export const createInvite = (input: any) => getDataAdapter().createInvite(input);
export const acceptInvite = (input: any) => getDataAdapter().acceptInvite(input);

export const listTasks = (workspaceId: any) => getDataAdapter().listTasks(workspaceId);
export const createTask = (input: any) => getDataAdapter().createTask(input);
export const updateTask = (input: any) => getDataAdapter().updateTask(input);
export const deleteTask = (id: any) => getDataAdapter().deleteTask(id);

export const listTaskGroups = (workspaceId: any) => getDataAdapter().listTaskGroups(workspaceId);
export const createTaskGroup = (input: any) => getDataAdapter().createTaskGroup(input);
export const listTaskLists = (workspaceId: any) => getDataAdapter().listTaskLists(workspaceId);
export const createTaskList = (input: any) => getDataAdapter().createTaskList(input);
export const listTaskPlacements = (workspaceId: any) => getDataAdapter().listTaskPlacements(workspaceId);
export const createTaskPlacement = (input: any) => getDataAdapter().createTaskPlacement(input);
export const updateTaskPlacement = (input: any) => getDataAdapter().updateTaskPlacement(input);
export const deleteTaskPlacement = (id: any) => getDataAdapter().deleteTaskPlacement(id);
export const deleteTaskPlacementByTaskAndList = (input: any) => getDataAdapter().deleteTaskPlacementByTaskAndList(input);

export const createWorkspace = (input: any) => getDataAdapter().createWorkspace(input);
export const updateWorkspace = (input: any) => getDataAdapter().updateWorkspace(input);
export const deleteWorkspace = (id: any) => getDataAdapter().deleteWorkspace(id);
export const updateTaskGroup = (input: any) => getDataAdapter().updateTaskGroup(input);
export const deleteTaskGroup = (id: any) => getDataAdapter().deleteTaskGroup(id);
export const updateTaskList = (input: any) => getDataAdapter().updateTaskList(input);
export const deleteTaskList = (id: any) => getDataAdapter().deleteTaskList(id);
export const listTaskParticipants = (workspaceId: any) => getDataAdapter().listTaskParticipants(workspaceId);
export const upsertTaskParticipant = (input: any) => getDataAdapter().upsertTaskParticipant(input);
export const removeTaskParticipant = (input: any) => getDataAdapter().removeTaskParticipant(input);
export const createMemberPlaceholder = (input: any) => getDataAdapter().createMemberPlaceholder(input);
export const setMemberRole = (input: any) => getDataAdapter().setMemberRole(input);
export const getLastEntry = (workspaceId: any) => getDataAdapter().getLastEntry(workspaceId);
export const duplicateTask = (workspaceId: any, taskId: any, createdBy: any) => getDataAdapter().duplicateTask(workspaceId, taskId, createdBy);
