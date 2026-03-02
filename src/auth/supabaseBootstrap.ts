import { supabase } from "../data/supabaseClient";
import type { Workspace } from "../domain/types";

const LAST_WS_KEY = "nxtup.lastSupabaseWorkspaceId.v1";

/**
 * List workspaces for the currently authenticated user from Supabase.
 */
async function listWorkspacesFromSupabase(): Promise<Workspace[]> {
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

    return workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description ?? undefined,
        createdBy: session.session.user.id
    }));
}

/**
 * Create a workspace in Supabase and add current user as owner.
 */
async function createWorkspaceInSupabase(name: string): Promise<Workspace> {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error("Not authenticated");

    const userId = session.session.user.id;

    // First ensure profile exists so workspaces.created_by foreign key is satisfied
    const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
            id: userId,
            name: session.session.user.email?.split("@")[0] || "User",
            email: session.session.user.email
        }, { onConflict: "id" });

    if (profileError) {
        console.warn("Failed to upsert profile:", profileError);
    }

    // Create workspace
    const { data: ws, error: wsError } = await supabase
        .from("workspaces")
        .insert({ name, created_by: userId })
        .select()
        .single();

    // Add as workspace member
    const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
            workspace_id: ws.id,
            profile_id: userId,
            role: "owner",
            status: "active"
        });

    if (memberError) {
        console.warn("Failed to add as member:", memberError);
    }

    // Create default Inbox list
    const { error: inboxError } = await supabase
        .from("task_lists")
        .insert({
            workspace_id: ws.id,
            group_id: null,
            type: "inbox",
            title: "Inbox",
            sort_order: Math.floor(Date.now() / 1000)
        });

    if (inboxError) {
        console.warn("Failed to create default inbox:", inboxError);
    }

    return {
        id: ws.id,
        name: ws.name,
        description: ws.description ?? undefined,
        createdBy: userId
    };
}

/**
 * Ensures the authenticated user has at least one workspace.
 * If not, creates a "My Workspace" default.
 * Returns the workspace ID to navigate to.
 */
export async function ensureSupabaseDemoWorkspace(): Promise<string> {
    const workspaces = await listWorkspacesFromSupabase();
    if (workspaces.length > 0) {
        // Return the last used one or the first one
        const lastId = getLastSupabaseWorkspaceId();
        const last = workspaces.find((w) => w.id === lastId);
        if (last) return last.id;
        return workspaces[0]!.id;
    }

    // Create a default workspace
    const ws = await createWorkspaceInSupabase("My Workspace");
    setLastSupabaseWorkspaceId(ws.id);
    return ws.id;
}

/**
 * Get the last used Supabase workspace ID from localStorage.
 */
export function getLastSupabaseWorkspaceId(): string | null {
    try {
        return localStorage.getItem(LAST_WS_KEY);
    } catch {
        return null;
    }
}

/**
 * Save the last used Supabase workspace ID to localStorage.
 */
export function setLastSupabaseWorkspaceId(id: string): void {
    try {
        localStorage.setItem(LAST_WS_KEY, id);
    } catch {
        // ignore
    }
}
