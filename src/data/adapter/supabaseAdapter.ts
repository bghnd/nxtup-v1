import type { DataAdapter } from "./types";
import type {
  Invite,
  Profile,
  ProfileId,
  Task,
  TaskGroup,
  TaskList,
  TaskPlacement,
  TaskParticipant,
  TaskParticipantRole,
  Workspace,
  WorkspaceId
} from "../../domain/types";
import type { WorkspaceRole } from "../../domain/types";
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

async function requireAuthUserId(): Promise<string> {
  const s = await supabase.auth.getSession();
  const id = s.data.session?.user?.id;
  if (!id) throw new Error("Not authenticated with Supabase.");
  return id;
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

function mapParticipant(row: any): TaskParticipant {
  return {
    workspaceId: row.workspace_id,
    taskId: row.task_id,
    profileId: row.profile_id,
    role: row.role,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

export const supabaseAdapter: DataAdapter = {
  async listWorkspaces() {
    assertEnv();
    const authUserId = await requireAuthUserId();
    // Prefer membership-driven listing.
    const { data, error } = await supabase
      .from("workspace_members")
      .select("workspace_id,workspaces:workspace_id(id,name,created_by)")
      .eq("profile_id", authUserId)
      .neq("status", "removed");
    if (error) throw error;
    const rows = (data ?? [])
      .map((r: any) => r.workspaces)
      .filter(Boolean)
      .map(mapWorkspace);
    // Dedup just in case.
    const m = new Map<string, Workspace>();
    for (const w of rows) m.set(w.id, w);
    return Array.from(m.values()).sort((a, b) => (a.name < b.name ? -1 : 1));
  },

  async createWorkspace(input: { name: string }) {
    assertEnv();
    const authUserId = await requireAuthUserId();
    const ws = await supabase
      .from("workspaces")
      .insert({ name: input.name.trim() || "Workspace", created_by: authUserId })
      .select("*")
      .single();
    if (ws.error) throw ws.error;

    // Ensure creator membership.
    const mem = await supabase.from("workspace_members").upsert({
      workspace_id: ws.data.id,
      profile_id: authUserId,
      role: "owner",
      status: "active"
    });
    if (mem.error) throw mem.error;
    return mapWorkspace(ws.data);
  },

  async updateWorkspace(input: { id: WorkspaceId; name: string }) {
    assertEnv();
    const { data, error } = await supabase
      .from("workspaces")
      .update({ name: input.name.trim() || "Workspace" })
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return mapWorkspace(data);
  },

  async deleteWorkspace(input: { id: WorkspaceId }) {
    assertEnv();
    const { error } = await supabase.from("workspaces").delete().eq("id", input.id);
    if (error) throw error;
  },

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

  async createMemberPlaceholder(input: {
    workspaceId: WorkspaceId;
    name: string;
    email?: string | null;
    role?: WorkspaceRole;
    status?: "active" | "invited";
  }) {
    assertEnv();
    const authUserId = await requireAuthUserId();
    const id = crypto.randomUUID();
    const profileIns = await supabase
      .from("profiles")
      .insert({
        id,
        name: input.name.trim() || "New member",
        email: input.email ?? null,
        avatar_url: null
      })
      .select("*")
      .single();
    if (profileIns.error) throw profileIns.error;
    const mem = await supabase.from("workspace_members").upsert({
      workspace_id: input.workspaceId,
      profile_id: id,
      role: input.role ?? "member",
      status: input.status ?? "invited",
      created_at: new Date().toISOString()
    });
    if (mem.error) throw mem.error;
    // Keep current user as creator in invites/membership rules; this just creates a placeholder member row.
    void authUserId;
    return mapProfile(profileIns.data);
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
    const authUserId = await requireAuthUserId();
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
        created_by: authUserId
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

  async setMemberRole(input: { workspaceId: WorkspaceId; profileId: ProfileId; role: WorkspaceRole }) {
    assertEnv();
    const { error } = await supabase
      .from("workspace_members")
      .update({ role: input.role })
      .eq("workspace_id", input.workspaceId)
      .eq("profile_id", input.profileId);
    if (error) throw error;
  },

  async removeMember(input: { workspaceId: WorkspaceId; profileId: ProfileId }) {
    assertEnv();
    const { error } = await supabase
      .from("workspace_members")
      .update({ status: "removed" })
      .eq("workspace_id", input.workspaceId)
      .eq("profile_id", input.profileId);
    if (error) throw error;
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

  async createTaskGroup(input: { workspaceId: WorkspaceId; title: string; description?: string | null }) {
    assertEnv();
    const authUserId = await requireAuthUserId();
    const { data, error } = await supabase
      .from("task_groups")
      .insert({
        workspace_id: input.workspaceId,
        title: input.title.trim() || "Group",
        description: input.description ?? null,
        sort_order: 0,
        created_by: authUserId
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapGroup(data);
  },

  async updateTaskGroup(input: { id: string; title?: string; description?: string | null; sortOrder?: number }) {
    assertEnv();
    const patch: any = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
    const { data, error } = await supabase.from("task_groups").update(patch).eq("id", input.id).select("*").single();
    if (error) throw error;
    return mapGroup(data);
  },

  async deleteTaskGroup(input: { id: string }) {
    assertEnv();
    const { error } = await supabase.from("task_groups").delete().eq("id", input.id);
    if (error) throw error;
  },

  async listTaskLists(workspaceId: WorkspaceId) {
    assertEnv();
    const { data, error } = await supabase.from("task_lists").select("*").eq("workspace_id", workspaceId).order("sort_order");
    if (error) throw error;
    return (data ?? []).map(mapList);
  },

  async createTaskList(input: {
    workspaceId: WorkspaceId;
    groupId: string | null;
    type: TaskList["type"];
    refId?: string | null;
    title: string;
  }) {
    assertEnv();
    const authUserId = await requireAuthUserId();
    const { data, error } = await supabase
      .from("task_lists")
      .insert({
        workspace_id: input.workspaceId,
        group_id: input.groupId,
        type: input.type,
        ref_id: input.refId ?? null,
        title: input.title.trim() || "List",
        sort_order: 0,
        created_by: authUserId
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapList(data);
  },

  async updateTaskList(input: { id: string; groupId?: string | null; title?: string; sortOrder?: number }) {
    assertEnv();
    const patch: any = {};
    if (input.groupId !== undefined) patch.group_id = input.groupId;
    if (input.title !== undefined) patch.title = input.title;
    if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
    const { data, error } = await supabase.from("task_lists").update(patch).eq("id", input.id).select("*").single();
    if (error) throw error;
    return mapList(data);
  },

  async deleteTaskList(input: { id: string }) {
    assertEnv();
    const { error } = await supabase.from("task_lists").delete().eq("id", input.id);
    if (error) throw error;
  },

  async listTaskPlacements(workspaceId: WorkspaceId) {
    assertEnv();
    const { data, error } = await supabase.from("task_placements").select("*").eq("workspace_id", workspaceId);
    if (error) throw error;
    return (data ?? []).map(mapPlacement);
  },

  async createTaskPlacement(input: CreateTaskPlacementInput) {
    assertEnv();
    const authUserId = await requireAuthUserId();
    const { data, error } = await supabase
      .from("task_placements")
      // Idempotent upsert to match mock behavior: a task can be dropped onto a list it’s already in.
      .upsert(
        {
          workspace_id: input.workspaceId,
          task_id: input.taskId,
          list_id: input.listId,
          position: input.position ?? 0,
          created_by: authUserId
        },
        { onConflict: "task_id,list_id" }
      )
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

  async listTaskParticipants(workspaceId: WorkspaceId) {
    assertEnv();
    const { data, error } = await supabase.from("task_participants").select("*").eq("workspace_id", workspaceId);
    if (error) throw error;
    return (data ?? []).map(mapParticipant);
  },

  async upsertTaskParticipant(input: {
    workspaceId: WorkspaceId;
    taskId: string;
    profileId: ProfileId;
    role: TaskParticipantRole;
    createdBy: ProfileId;
  }) {
    assertEnv();
    const authUserId = await requireAuthUserId();
    // createdBy should always be the current auth user in Supabase mode.
    void input.createdBy;
    const { data, error } = await supabase
      .from("task_participants")
      .upsert(
        {
          workspace_id: input.workspaceId,
          task_id: input.taskId,
          profile_id: input.profileId,
          role: input.role,
          created_by: authUserId
        },
        { onConflict: "task_id,profile_id" }
      )
      .select("*")
      .single();
    if (error) throw error;
    return mapParticipant(data);
  },

  async removeTaskParticipant(input: { workspaceId: WorkspaceId; taskId: string; profileId: ProfileId }) {
    assertEnv();
    const { error } = await supabase
      .from("task_participants")
      .delete()
      .eq("workspace_id", input.workspaceId)
      .eq("task_id", input.taskId)
      .eq("profile_id", input.profileId);
    if (error) throw error;
  },

  async createTask(input: CreateTaskInput) {
    assertEnv();
    const authUserId = await requireAuthUserId();
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
        created_by: authUserId
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


