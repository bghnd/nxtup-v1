import type { DataAdapter } from "./types";
import type {
  Invite,
  Profile,
  Task,
  TaskGroup,
  TaskList,
  TaskPlacement,
  Workspace,
  WorkspaceId
} from "../../domain/types";
import type {
  CreateInviteInput,
  CreateTaskInput,
  CreateTaskPlacementInput,
  UpdateTaskInput,
  WorkspaceMemberRow
} from "../api";
import { supabase } from "../supabaseClient";

function assertEnv() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) {
    throw new Error("Supabase env missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.");
  }
}

function mapWorkspace(row: any): Workspace {
  return { id: row.id, name: row.name, createdBy: row.created_by };
}

function mapProfile(row: any): Profile {
  return { id: row.id, name: row.name, email: row.email, avatarUrl: row.avatar_url };
}

function mapTask(row: any): Task {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    location: row.location,
    title: row.title,
    description: row.description ?? undefined,
    priority: row.priority,
    dueDate: row.due_date ?? undefined,
    assigneeId: row.assignee_id ?? null,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    checklist: { total: 0, done: 0 }, // TODO: join checklist items
    commentsCount: 0, // TODO: join comments
    tags: [] // TODO: join tags
  };
}

function mapGroup(row: any): TaskGroup {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    description: row.description ?? null,
    sortOrder: row.sort_order
  };
}

function mapList(row: any): TaskList {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    groupId: row.group_id ?? null,
    type: row.type,
    refId: row.ref_id ?? null,
    title: row.title,
    sortOrder: row.sort_order
  };
}

function mapPlacement(row: any): TaskPlacement {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    taskId: row.task_id,
    listId: row.list_id,
    position: Number(row.position),
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

export const supabaseAdapter: DataAdapter = {
  async getWorkspace(workspaceId: WorkspaceId) {
    assertEnv();
    const { data, error } = await supabase.from("workspaces").select("*").eq("id", workspaceId).single();
    if (error) throw error;
    return mapWorkspace(data);
  },

  async listProfiles(workspaceId: WorkspaceId) {
    assertEnv();
    // MVP: profiles are global; for a real app we’ll join via workspace_members.
    void workspaceId;
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) throw error;
    return (data ?? []).map(mapProfile);
  },

  async listWorkspaceMembers(workspaceId: WorkspaceId) {
    assertEnv();
    const { data, error } = await supabase
      .from("workspace_members")
      .select("role,status,profiles:profile_id(id,name,email,avatar_url)")
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      profile: mapProfile(r.profiles),
      role: r.role,
      status: r.status
    })) as WorkspaceMemberRow[];
  },

  async listInvites(workspaceId: WorkspaceId) {
    assertEnv();
    const { data, error } = await supabase.from("invites").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any): Invite => ({
      id: r.id,
      workspaceId: r.workspace_id,
      email: r.email,
      role: r.role,
      token: r.token,
      expiresAt: r.expires_at,
      acceptedAt: r.accepted_at,
      createdBy: r.created_by,
      createdAt: r.created_at
    }));
  },

  async createInvite(input: CreateInviteInput) {
    assertEnv();
    const token = `inv_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("invites")
      .insert({
        workspace_id: input.workspaceId,
        email: input.email.trim().toLowerCase(),
        role: input.role,
        token,
        expires_at: expiresAt,
        created_by: input.createdBy
      })
      .select("*")
      .single();
    if (error) throw error;
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      email: data.email,
      role: data.role,
      token: data.token,
      expiresAt: data.expires_at,
      acceptedAt: data.accepted_at,
      createdBy: data.created_by,
      createdAt: data.created_at
    };
  },

  async acceptInvite(_input: { token: string; acceptAsProfileId: string }) {
    // Real invite acceptance is typically a server-side function.
    throw new Error("Invite acceptance not implemented in Supabase adapter yet (use mock mode for now).");
  },

  async listTasks(workspaceId: WorkspaceId) {
    assertEnv();
    const { data, error } = await supabase.from("tasks").select("*").eq("workspace_id", workspaceId);
    if (error) throw error;
    return (data ?? []).map(mapTask);
  },

  async listTaskGroups(workspaceId: WorkspaceId) {
    assertEnv();
    const { data, error } = await supabase.from("task_groups").select("*").eq("workspace_id", workspaceId).order("sort_order");
    if (error) throw error;
    return (data ?? []).map(mapGroup);
  },

  async listTaskLists(workspaceId: WorkspaceId) {
    assertEnv();
    const { data, error } = await supabase.from("task_lists").select("*").eq("workspace_id", workspaceId).order("sort_order");
    if (error) throw error;
    return (data ?? []).map(mapList);
  },

  async listTaskPlacements(workspaceId: WorkspaceId) {
    assertEnv();
    const { data, error } = await supabase.from("task_placements").select("*").eq("workspace_id", workspaceId);
    if (error) throw error;
    return (data ?? []).map(mapPlacement);
  },

  async createTaskPlacement(input: CreateTaskPlacementInput) {
    assertEnv();
    const { data, error } = await supabase
      .from("task_placements")
      .insert({
        workspace_id: input.workspaceId,
        task_id: input.taskId,
        list_id: input.listId,
        position: input.position ?? 0,
        created_by: input.createdBy
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapPlacement(data);
  },

  async updateTaskPlacement(input: { id: string; position?: number; listId?: string }) {
    assertEnv();
    const { data, error } = await supabase
      .from("task_placements")
      .update({
        position: input.position,
        list_id: input.listId
      })
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return mapPlacement(data);
  },

  async deleteTaskPlacement(id: string) {
    assertEnv();
    const { error } = await supabase.from("task_placements").delete().eq("id", id);
    if (error) throw error;
  },

  async deleteTaskPlacementByTaskAndList(input: { workspaceId: WorkspaceId; taskId: string; listId: string }) {
    assertEnv();
    const { error } = await supabase
      .from("task_placements")
      .delete()
      .eq("workspace_id", input.workspaceId)
      .eq("task_id", input.taskId)
      .eq("list_id", input.listId);
    if (error) throw error;
  },

  async createTask(input: CreateTaskInput) {
    assertEnv();
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        workspace_id: input.workspaceId,
        location: input.location,
        title: input.title,
        description: null,
        priority: input.priority,
        due_date: input.dueDate ?? null,
        status: "active",
        assignee_id: input.assigneeId ?? null,
        created_by: input.createdBy
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapTask(data);
  },

  async updateTask(input: UpdateTaskInput) {
    assertEnv();
    const patch: any = {};
    if (input.location !== undefined) patch.location = input.location;
    if (input.title !== undefined) patch.title = input.title;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.dueDate !== undefined) patch.due_date = input.dueDate === null ? null : input.dueDate;
    if (input.assigneeId !== undefined) patch.assignee_id = input.assigneeId;
    const { data, error } = await supabase.from("tasks").update(patch).eq("id", input.id).select("*").single();
    if (error) throw error;
    return mapTask(data);
  },

  async deleteTask(id: string) {
    assertEnv();
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
  }
};


