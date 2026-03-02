import { getDataAdapter } from "./adapter";

// Import non-adapter functions directly from api.ts (these bypass the adapter pattern for now)
import {
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    updateTaskGroup,
    deleteTaskGroup,
    updateTaskList,
    deleteTaskList,
    listTaskParticipants,
    upsertTaskParticipant,
    removeTaskParticipant,
    createMemberPlaceholder,
    setMemberRole,
    getLastEntry,
    duplicateTask
} from "./api";

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

// Re-export functions not yet on the adapter (use mock api.ts directly for now):
export {
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    updateTaskGroup,
    deleteTaskGroup,
    updateTaskList,
    deleteTaskList,
    listTaskParticipants,
    upsertTaskParticipant,
    removeTaskParticipant,
    createMemberPlaceholder,
    setMemberRole,
    getLastEntry,
    duplicateTask
};
