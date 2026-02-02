import { getDataAdapter } from "./adapter";

// Import non-adapter functions directly from api.ts (these bypass the adapter pattern for now)
import {
    listWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    createTaskGroup,
    updateTaskGroup,
    deleteTaskGroup,
    createTaskList,
    updateTaskList,
    deleteTaskList,
    listTaskParticipants,
    upsertTaskParticipant,
    removeTaskParticipant,
    createMemberPlaceholder,
    setMemberRole
} from "./api";

export const data = getDataAdapter();

// Convenience re-exports so UI can import stable functions without caring about backend.
// These go through the adapter pattern:
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

// Re-export functions not yet on the adapter (use mock api.ts directly for now):
export {
    listWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    createTaskGroup,
    updateTaskGroup,
    deleteTaskGroup,
    createTaskList,
    updateTaskList,
    deleteTaskList,
    listTaskParticipants,
    upsertTaskParticipant,
    removeTaskParticipant,
    createMemberPlaceholder,
    setMemberRole
};
