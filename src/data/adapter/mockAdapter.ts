import type { DataAdapter } from "./types";
import {
  acceptInvite,
  createInvite,
  createTask,
  deleteTask,
  getWorkspace,
  listInvites,
  listProfiles,
  listTasks,
  listWorkspaceMembers,
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
  createTask,
  updateTask,
  deleteTask
};




