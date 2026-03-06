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

function isValidUUID(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

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
    workspaceId: row.workspaceId || row.workspace_id,
    location: row.location as Task["location"],
    groupId: row.group_id ?? null,
    title: row.title,
    description: row.description,
    priority: row.priority as Task["priority"],
    dueDate: row.dueDate || row.due_date,
    assigneeId: row.assigneeId || row.assignee_id,
    createdBy: row.createdBy || row.created_by,
    updatedAt: row.updatedAt || row.updated_at,
    checklist: { total: 0, done: 0 },
    commentsCount: 0,
    status: (row as any).status || "active",
    tags: []
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
  async listWorkspaces() {
    assertEnv();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return [];

    const userId = session.session.user.id;

    // Get workspaces where user is a member
    const { data: memberRows, error: memberError } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("profile_id", userId);

    if (memberError || !memberRows) return [];

    const workspaceIds = memberRows.map((r) => r.workspace_id);
    if (workspaceIds.length === 0) return [];

    const { data: workspaces, error } = await supabase
      .from("workspaces")
      .select("*")
      .in("id", workspaceIds);

    if (error || !workspaces) return [];

    return workspaces.map(mapWorkspace);
  },

  async getWorkspace(workspaceId: WorkspaceId) {
    assertEnv();
    if (!isValidUUID(workspaceId)) throw new Error(`Invalid UUID: ${workspaceId}`);
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
    if (!isValidUUID(workspaceId)) return [];
    const { data, error } = await supabase.from("tasks").select("*").eq("workspace_id", workspaceId);
    if (error) throw error;
    return (data ?? []).map(mapTask);
  },

  async listTaskGroups(workspaceId: WorkspaceId) {
    assertEnv();
    if (!isValidUUID(workspaceId)) return [];
    const { data, error } = await supabase.from("task_groups").select("*").eq("workspace_id", workspaceId).order("sort_order");
    if (error) throw error;
    return (data ?? []).map(mapGroup);
  },

  async createTaskGroup(input) {
    assertEnv();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error("Not authenticated");
    const userId = session.session.user.id;

    const { data, error } = await supabase
      .from("task_groups")
      .insert({
        workspace_id: input.workspaceId,
        title: input.title.trim() || "Untitled Group",
        description: input.description,
        sort_order: Math.floor(Date.now() / 1000),
        created_by: userId
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapGroup(data);
  },

  async listTaskLists(workspaceId: WorkspaceId) {
    assertEnv();
    if (!isValidUUID(workspaceId)) return [];
    const { data, error } = await supabase.from("task_lists").select("*").eq("workspace_id", workspaceId).order("sort_order");
    if (error) throw error;
    return (data ?? []).map(mapList);
  },

  async createTaskList(input) {
    assertEnv();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error("Not authenticated");
    const userId = session.session.user.id;

    const { data, error } = await supabase
      .from("task_lists")
      .insert({
        workspace_id: input.workspaceId,
        group_id: input.groupId,
        type: input.type,
        ref_id: input.refId,
        title: input.title.trim() || "Untitled List",
        description: input.description,
        sort_order: Math.floor(Date.now() / 1000), // quick easy sort fallback that fits in INT4
        created_by: userId
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapList(data);
  },

  async listTaskPlacements(workspaceId: WorkspaceId) {
    assertEnv();
    if (!isValidUUID(workspaceId)) return [];
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
        group_id: input.groupId ?? null,
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
    if (input.groupId !== undefined) patch.group_id = input.groupId === null ? null : input.groupId;
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
  },

  async createWorkspace(input) {
    assertEnv();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error("Not authenticated");
    const userId = session.session.user.id;

    const { data, error } = await supabase
      .from("workspaces")
      .insert({ name: input.name.trim() || "Untitled Workspace", created_by: userId })
      .select("*")
      .single();
    if (error) throw error;

    // Typically a Postgres trigger handles member creation, but we explicitly add them here for MVP
    await supabase.from("workspace_members").insert({
      workspace_id: data.id,
      profile_id: userId,
      role: "owner",
      status: "active"
    });

    return mapWorkspace(data);
  },

  async updateWorkspace(input) {
    assertEnv();
    const patch: any = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;

    const { data, error } = await supabase
      .from("workspaces")
      .update(patch)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return mapWorkspace(data);
  },

  async deleteWorkspace(id) {
    assertEnv();
    const { error } = await supabase.from("workspaces").delete().eq("id", id);
    if (error) throw error;
  },

  async updateTaskGroup(input) {
    assertEnv();
    const patch: any = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;

    const { data, error } = await supabase
      .from("task_groups")
      .update(patch)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return mapGroup(data);
  },

  async deleteTaskGroup(id) {
    assertEnv();
    // Assuming DB has ON DELETE CASCADE or ON DELETE SET NULL for lists. If not, we nullify them.
    await supabase.from("task_lists").update({ group_id: null }).eq("group_id", id);
    const { error } = await supabase.from("task_groups").delete().eq("id", id);
    if (error) throw error;
  },

  async updateTaskList(input) {
    assertEnv();
    const patch: any = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.groupId !== undefined) patch.group_id = input.groupId;

    const { data, error } = await supabase
      .from("task_lists")
      .update(patch)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return mapList(data);
  },

  async deleteTaskList(id) {
    assertEnv();
    // Assuming task_placements cascades. If not, delete placements first.
    await supabase.from("task_placements").delete().eq("list_id", id);
    const { error } = await supabase.from("task_lists").delete().eq("id", id);
    if (error) throw error;
  },

  async listTaskParticipants(workspaceId) {
    assertEnv();
    const { data, error } = await supabase
      .from("task_participants")
      .select("*")
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      taskId: r.task_id,
      profileId: r.profile_id,
      role: r.role,
      createdBy: r.created_by,
      createdAt: r.created_at
    }));
  },

  async upsertTaskParticipant(input) {
    assertEnv();
    const { data, error } = await supabase
      .from("task_participants")
      .upsert({
        workspace_id: input.workspaceId,
        task_id: input.taskId,
        profile_id: input.profileId,
        role: input.role,
        created_by: input.createdBy
      }, { onConflict: "workspace_id,task_id,profile_id" })
      .select("*")
      .single();
    if (error) throw error;
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      taskId: data.task_id,
      profileId: data.profile_id,
      role: data.role,
      createdBy: data.created_by,
      createdAt: data.created_at
    };
  },

  async removeTaskParticipant(input) {
    assertEnv();
    const { error } = await supabase
      .from("task_participants")
      .delete()
      .eq("workspace_id", input.workspaceId)
      .eq("task_id", input.taskId)
      .eq("profile_id", input.profileId);
    if (error) throw error;
  },

  async createMemberPlaceholder(input) {
    assertEnv();
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        name: input.name.trim() || "Unknown",
        email: input.email?.trim() || null
      })
      .select("*")
      .single();
    if (error) throw error;

    // Add them to the workspace
    await supabase.from("workspace_members").insert({
      workspace_id: input.workspaceId,
      profile_id: data.id,
      role: input.role ?? "member",
      status: input.status ?? "invited"
    });

    return mapProfile(data);
  },

  async setMemberRole(input) {
    assertEnv();
    const { error } = await supabase
      .from("workspace_members")
      .update({ role: input.role })
      .eq("workspace_id", input.workspaceId)
      .eq("profile_id", input.profileId);
    if (error) throw error;
  },

  async getLastEntry(workspaceId) {
    assertEnv();
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return mapTask(data);
  },

  async duplicateTask(workspaceId, taskId, createdBy) {
    assertEnv();
    // 1. Fetch original task
    const { data: original, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .single();
    if (fetchError || !original) throw new Error("Task not found");

    // 2. Insert new task
    const { id: _oldId, created_at: _oldCreatedAt, updated_at: _oldUpdatedAt, ...taskData } = original;
    const { data: newTask, error: insertError } = await supabase
      .from("tasks")
      .insert({ ...taskData, created_by: createdBy })
      .select("*")
      .single();
    if (insertError) throw insertError;

    // 3. Duplicate placements
    const { data: placements } = await supabase
      .from("task_placements")
      .select("*")
      .eq("task_id", taskId)
      .eq("workspace_id", workspaceId);

    if (placements && placements.length > 0) {
      const newPlacements = placements.map(p => {
        const { id: _pId, created_at: _pCreated, ...pData } = p;
        return { ...pData, task_id: newTask.id, created_by: createdBy };
      });
      await supabase.from("task_placements").insert(newPlacements);
    }

    // 4. Duplicate participants
    const { data: participants } = await supabase
      .from("task_participants")
      .select("*")
      .eq("task_id", taskId)
      .eq("workspace_id", workspaceId);

    if (participants && participants.length > 0) {
      const newParticipants = participants.map(p => {
        const { id: _pId, created_at: _pCreated, ...pData } = p;
        return { ...pData, task_id: newTask.id, created_by: createdBy };
      });
      await supabase.from("task_participants").insert(newParticipants);
    }

    return mapTask(newTask);
  }
};


