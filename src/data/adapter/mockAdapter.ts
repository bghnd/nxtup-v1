import type { DataAdapter } from "./types";
import {
  acceptInvite,
  createInvite,
  createTaskPlacement,
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
  listTasks,
  listWorkspaceMembers,
  updateTaskPlacement,
  updateTask
} from "../api";

export const mockAdapter: DataAdapter = {
  getWorkspace,
  listProfiles,
  listWorkspaceMembers,
  listInvites,
  createInvite,
  acceptInvite,
  listTasks,
  listTaskGroups,
  listTaskLists,
  listTaskPlacements,
  createTaskPlacement,
  updateTaskPlacement,
  deleteTaskPlacement,
  deleteTaskPlacementByTaskAndList,
  createTask,
  updateTask,
  deleteTask
};




