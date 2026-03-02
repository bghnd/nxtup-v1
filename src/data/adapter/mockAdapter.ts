import type { DataAdapter } from "./types";
import {
  acceptInvite,
  createInvite,
  createTaskPlacement,
  createTaskGroup,
  createTask,
  deleteTask,
  deleteTaskPlacementByTaskAndList,
  deleteTaskPlacement,
  getWorkspace,
  listInvites,
  listProfiles,
  listTaskGroups,
  listTaskLists,
  listTaskPlacements,
  createTaskList,
  listTasks,
  listWorkspaceMembers,
  listWorkspaces,
  updateTaskPlacement,
  updateTask
} from "../api";

export const mockAdapter: DataAdapter = {
  listWorkspaces,
  getWorkspace,
  listProfiles,
  listWorkspaceMembers,
  listInvites,
  createInvite,
  acceptInvite,
  listTasks,
  listTaskGroups,
  createTaskGroup,
  listTaskLists,
  createTaskList,
  listTaskPlacements,
  createTaskPlacement,
  updateTaskPlacement,
  deleteTaskPlacement,
  deleteTaskPlacementByTaskAndList,
  createTask,
  updateTask,
  deleteTask
};




