import { supabase } from "../data/supabaseClient";

const LAST_WORKSPACE_KEY = "nxtup.supabase.lastWorkspaceId.v1";

export function getLastSupabaseWorkspaceId(): string | null {
  try {
    return localStorage.getItem(LAST_WORKSPACE_KEY);
  } catch {
    return null;
  }
}

export function clearLastSupabaseWorkspaceId() {
  try {
    localStorage.removeItem(LAST_WORKSPACE_KEY);
  } catch {
    // ignore
  }
}

function setLastSupabaseWorkspaceId(id: string) {
  try {
    localStorage.setItem(LAST_WORKSPACE_KEY, id);
  } catch {
    // ignore
  }
}

export async function ensureSupabaseDemoWorkspace(): Promise<string> {
  const session = (await supabase.auth.getSession()).data.session;
  const user = session?.user;
  if (!user) throw new Error("No Supabase session");

  // Upsert profile for current user.
  const up = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name ?? user.email ?? "User",
    avatar_url: user.user_metadata?.avatar_url ?? null
  });
  if (up.error) throw up.error;

  // Resolve a workspace id (cached → existing → create).
  let workspaceId: string | null = getLastSupabaseWorkspaceId();

  // If we have a cached id, verify it still exists (the user may have deleted it to reset seed data).
  if (workspaceId) {
    const check = await supabase.from("workspaces").select("id").eq("id", workspaceId).maybeSingle();
    if (check.error) throw check.error;
    if (!check.data?.id) {
      clearLastSupabaseWorkspaceId();
      workspaceId = null;
    }
  }

  if (!workspaceId) {
    const existing = await supabase
      .from("workspaces")
      .select("id")
      .eq("created_by", user.id)
      .limit(1)
      .maybeSingle();
    if (existing.error) throw existing.error;
    workspaceId = existing.data?.id ?? null;
  }

  if (!workspaceId) {
    const ws = await supabase
      .from("workspaces")
      .insert({ name: "Design Sprint", created_by: user.id })
      .select("id")
      .single();
    if (ws.error) throw ws.error;
    workspaceId = ws.data.id as string;
  }

  setLastSupabaseWorkspaceId(workspaceId);

  // Always ensure membership row for self (idempotent).
  const mem = await supabase.from("workspace_members").upsert({
    workspace_id: workspaceId,
    profile_id: user.id,
    role: "owner",
    status: "active"
  });
  if (mem.error) throw mem.error;

  // ---- Ensure baseline groups + lists exist (idempotent, no duplicates).
  const groupsRes = await supabase
    .from("task_groups")
    .select("id,title")
    .eq("workspace_id", workspaceId);
  if (groupsRes.error) throw groupsRes.error;
  const groups = groupsRes.data ?? [];

  const getOrCreateGroup = async (title: string, description: string, sortOrder: number) => {
    const existing = groups.find((g) => g.title === title);
    if (existing) return existing.id as string;
    const created = await supabase
      .from("task_groups")
      .insert({
        workspace_id: workspaceId,
        title,
        description,
        sort_order: sortOrder,
        created_by: user.id
      })
      .select("id,title")
      .single();
    if (created.error) throw created.error;
    groups.push(created.data);
    return created.data.id as string;
  };

  const coreTeamGroupId = await getOrCreateGroup(
    "My Core Team",
    "People lists for day-to-day delivery and accountability.",
    100
  );
  const planningGroupId = await getOrCreateGroup("Planning", "Project + time-slot lists (MVP mock types).", 200);

  const listsRes = await supabase
    .from("task_lists")
    .select("id,type,ref_id,group_id,title")
    .eq("workspace_id", workspaceId);
  if (listsRes.error) throw listsRes.error;
  const lists = listsRes.data ?? [];

  const getOrCreateList = async (input: {
    group_id: string | null;
    type: string;
    ref_id: string | null;
    title: string;
    sort_order: number;
  }) => {
    const existing = lists.find(
      (l) =>
        l.type === input.type &&
        (l.ref_id ?? null) === input.ref_id &&
        (l.group_id ?? null) === input.group_id
    );
    if (existing) return existing.id as string;
    const created = await supabase
      .from("task_lists")
      .insert({
        workspace_id: workspaceId,
        group_id: input.group_id,
        type: input.type,
        ref_id: input.ref_id,
        title: input.title,
        sort_order: input.sort_order,
        created_by: user.id
      })
      .select("id,type,ref_id,group_id,title")
      .single();
    if (created.error) throw created.error;
    lists.push(created.data);
    return created.data.id as string;
  };

  const inboxListId = await getOrCreateList({
    group_id: null,
    type: "inbox",
    ref_id: null,
    title: "Inbox",
    sort_order: 0
  });
  const personListId = await getOrCreateList({
    group_id: coreTeamGroupId,
    type: "person",
    ref_id: user.id,
    title: "Me",
    sort_order: 100
  });
  const projectListId = await getOrCreateList({
    group_id: planningGroupId,
    type: "project",
    ref_id: "proj_nxtup_launch",
    title: "Project: NXTUP Launch",
    sort_order: 100
  });
  const timeListId = await getOrCreateList({
    group_id: planningGroupId,
    type: "time_slot",
    ref_id: "timeslot_first_thing_tomorrow",
    title: "Time Slot: First Thing Tomorrow",
    sort_order: 200
  });

  // ---- Ensure starter tasks exist (only if the workspace has zero tasks).
  const tasksRes = await supabase.from("tasks").select("id").eq("workspace_id", workspaceId).limit(1);
  if (tasksRes.error) throw tasksRes.error;
  if ((tasksRes.data ?? []).length === 0) {
    const t1 = await supabase
      .from("tasks")
      .insert({
        workspace_id: workspaceId,
        location: "inbox",
        title: "Inbox: Triage partner outreach list",
        priority: "medium",
        due_date: null,
        status: "active",
        assignee_id: null,
        created_by: user.id
      })
      .select("id")
      .single();
    if (t1.error) throw t1.error;

    const t2 = await supabase
      .from("tasks")
      .insert({
        workspace_id: workspaceId,
        location: "board",
        title: "Plan Q3 product roadmap",
        priority: "high",
        due_date: null,
        status: "active",
        assignee_id: user.id,
        created_by: user.id
      })
      .select("id")
      .single();
    if (t2.error) throw t2.error;

    const placements = await supabase.from("task_placements").insert([
      {
        workspace_id: workspaceId,
        task_id: t1.data.id,
        list_id: inboxListId,
        position: 100,
        created_by: user.id
      },
      {
        workspace_id: workspaceId,
        task_id: t2.data.id,
        list_id: personListId,
        position: 100,
        created_by: user.id
      },
      {
        workspace_id: workspaceId,
        task_id: t2.data.id,
        list_id: projectListId,
        position: 100,
        created_by: user.id
      }
    ]);
    if (placements.error) throw placements.error;
  }

  setLastSupabaseWorkspaceId(workspaceId);
  return workspaceId;
}


