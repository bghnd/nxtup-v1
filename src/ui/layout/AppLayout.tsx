import React from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { Bell, Inbox, LayoutDashboard, LogOut, Settings, Trello, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

import { cn } from "../lib/cn";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { SupabaseAuthModal } from "../components/SupabaseAuthModal";
import { useStubSession } from "../../auth/stubAuth";
import { consumeSupabaseRedirectFromUrl, getSupabaseSession, onSupabaseAuthChange } from "../../auth/supabaseAuth";
import { ensureSupabaseDemoWorkspace, getLastSupabaseWorkspaceId } from "../../auth/supabaseBootstrap";
import {
  createTaskPlacement,
  deleteTaskPlacementByTaskAndList,
  listTaskLists,
  listTasks,
  updateTask
} from "../../data/client";
import { getAdapterKind, useMockAdapter, useSupabaseAdapter } from "../../data/adapter";
import { ContextPanel, type PanelType } from "./contextPanel/ContextPanel";
import { InboxPanel } from "./contextPanel/InboxPanel";
import { loadDisplayPrefs } from "../state/displayPrefs";

const COLLAPSED_KEY = "nxtup.sidebar.collapsed.v1";
const COLLAPSE_MODE_KEY = "nxtup.sidebar.collapseMode.v1"; // "auto" | "manual"
const PANEL_PINNED_KEY = "nxtup.panel.pinned.v1";
const PANEL_LAST_KEY = "nxtup.panel.last.v1";
const PANEL_WIDTH_KEY = "nxtup.panel.width.v1";

const navItem =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100";

const navItemActive = "bg-slate-100 text-slate-900 font-medium";

export function AppLayout() {
  const { workspaceId } = useParams();
  const base = workspaceId ? `/w/${workspaceId}` : "/w/demo";
  const { session, setUser, setWorkspaceRole, allUsers } = useStubSession();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [authOpen, setAuthOpen] = React.useState(false);
  const [supabaseEmail, setSupabaseEmail] = React.useState<string | null>(null);
  const [adapterKind, setAdapterKind] = React.useState<"mock" | "supabase">(() => getAdapterKind());
  const inboxHoverTimer = React.useRef<number | null>(null);
  const [inboxDropActive, setInboxDropActive] = React.useState(false);
  const inboxDragDepth = React.useRef(0);
  const INBOX_LONG_HOVER_MS = 1200;

  const [panelPinned, setPanelPinned] = React.useState(() => {
    try {
      return localStorage.getItem(PANEL_PINNED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const [panel, setPanel] = React.useState<PanelType | null>(() => {
    try {
      const pinned = localStorage.getItem(PANEL_PINNED_KEY) === "1";
      if (!pinned) return null;
      const last = localStorage.getItem(PANEL_LAST_KEY) as string | null;
      if (last === "inbox" || last === "onlyme" || last === "raw") return last;
      // Back-compat for older saved panel ids.
      if (last === "activity") return "onlyme";
      if (last === "saved") return "raw";
      return "inbox";
    } catch {
      return null;
    }
  });

  const [panelWidth, setPanelWidth] = React.useState<number>(() => {
    try {
      const raw = localStorage.getItem(PANEL_WIDTH_KEY);
      const n = raw ? Number(raw) : 360;
      return Number.isFinite(n) ? n : 360;
    } catch {
      return 360;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(PANEL_PINNED_KEY, panelPinned ? "1" : "0");
      if (panelPinned && panel) localStorage.setItem(PANEL_LAST_KEY, panel);
      localStorage.setItem(PANEL_WIDTH_KEY, String(panelWidth));
    } catch {
      // ignore
    }
  }, [panelPinned, panel, panelWidth]);

  const [collapseMode, setCollapseMode] = React.useState<"auto" | "manual">(() => {
    try {
      return (localStorage.getItem(COLLAPSE_MODE_KEY) as "auto" | "manual") || "auto";
    } catch {
      return "auto";
    }
  });

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    const getStored = () => {
      try {
        return localStorage.getItem(COLLAPSED_KEY) === "1";
      } catch {
        return false;
      }
    };
    const getAuto = () => {
      if (typeof window === "undefined") return false;
      return window.matchMedia("(max-width: 1199px)").matches; // <1200px
    };
    return collapseMode === "manual" ? getStored() : getAuto();
  });

  // While any context panel is open, L1 must be rail-collapsed (icon-only).
  const effectiveSidebarCollapsed = panel ? true : sidebarCollapsed;

  React.useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, sidebarCollapsed ? "1" : "0");
      localStorage.setItem(COLLAPSE_MODE_KEY, collapseMode);
    } catch {
      // ignore
    }
  }, [sidebarCollapsed, collapseMode]);

  React.useEffect(() => {
    if (collapseMode !== "auto") return;
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1199px)");
    const onChange = () => setSidebarCollapsed(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [collapseMode]);

  const tasksQ = useQuery({
    queryKey: ["tasks", workspaceId ?? "demo"],
    queryFn: () => listTasks(workspaceId ?? "demo")
  });
  const listsQ = useQuery({
    queryKey: ["taskLists", workspaceId ?? "demo"],
    queryFn: () => listTaskLists(workspaceId ?? "demo")
  });
  const allTasks = tasksQ.data ?? [];
  const inboxTasks = allTasks.filter((t) => t.location === "inbox");
  const inboxCount = inboxTasks.length;
  const displayPrefs = React.useMemo(() => loadDisplayPrefs(), []);
  const inboxListId = (listsQ.data ?? []).find((l) => l.type === "inbox")?.id ?? null;

  React.useEffect(() => {
    const useSupabase = (import.meta.env.VITE_USE_SUPABASE as string | undefined) === "1";
    if (!useSupabase) return;

    let alive = true;
    async function refresh() {
      // If we just returned from a magic-link redirect, exchange ?code=... for a real session.
      await consumeSupabaseRedirectFromUrl();

      const s = await getSupabaseSession();
      const email = s.data.session?.user?.email ?? null;
      if (!alive) return;
      setSupabaseEmail(email);

      if (email) {
        useSupabaseAdapter();
        setAdapterKind(getAdapterKind());
        // Ensure there's a workspace to land in.
        const wsId = await ensureSupabaseDemoWorkspace();
        if (!alive) return;
        // If we're still on /w/demo/*, redirect to the real workspace.
        if (!workspaceId || workspaceId === "demo") {
          nav(`/w/${wsId}/board`, { replace: true });
        }
      } else {
        useMockAdapter();
        setAdapterKind(getAdapterKind());
        // If we have a remembered workspace and we are on demo, leave the user in demo (mock) mode.
        void getLastSupabaseWorkspaceId();
      }

      await qc.invalidateQueries();
    }

    void refresh();
    const unsub = onSupabaseAuthChange(() => void refresh());
    return () => {
      alive = false;
      unsub();
    };
  }, [nav, qc, workspaceId]);

  return (
    <div className="h-screen overflow-hidden bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-blue-600 text-white">
              N
            </div>
            NXTUP
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" aria-label="Notifications">
              <Bell size={18} />
            </Button>
            <div
              className={cn(
                "hidden md:flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                adapterKind === "supabase"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              )}
              title="Active backend for reads/writes"
            >
              Backend: {adapterKind === "supabase" ? "Supabase" : "Mock"}
            </div>
            {(import.meta.env.VITE_USE_SUPABASE as string | undefined) === "1" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAuthOpen(true)}
                title={supabaseEmail ? "Supabase auth: signed in" : "Supabase auth: sign in"}
              >
                {supabaseEmail ? "Supabase ✓" : "Sign in"}
              </Button>
            ) : null}
            <div className="flex items-center gap-2">
              <select
                className="hidden h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 md:block"
                value={session.user.id}
                onChange={(e) => setUser(e.target.value)}
                aria-label="Switch user (stub)"
                title="Stub auth: switch active user"
                disabled={Boolean(supabaseEmail)}
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <select
                className="hidden h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 md:block"
                value={session.workspaceRole}
                onChange={(e) => setWorkspaceRole(e.target.value as any)}
                aria-label="Switch role (stub)"
                title="Stub auth: switch workspace role"
                disabled={Boolean(supabaseEmail)}
              >
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
              <Avatar name={supabaseEmail ?? session.user.name} />
            </div>
          </div>
        </div>
      </header>

      <SupabaseAuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onAuthed={(wsId) => {
          // After verification + bootstrap, we can navigate to the real workspace.
          nav(`/w/${wsId}/board`, { replace: true });
        }}
      />

      {/* App chrome row: rail + (optional) context panel + main content.
          Only the main content should scroll; nav layers should not. */}
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "h-full shrink-0 border-r border-slate-200 bg-white overflow-y-auto",
            effectiveSidebarCollapsed ? "w-[76px] px-2" : "w-[240px] px-3"
          )}
        >
          <div className={cn("flex items-center justify-between", effectiveSidebarCollapsed ? "px-1 py-3" : "px-2 py-3")}>
            {!effectiveSidebarCollapsed ? (
              <div className="text-xs font-medium text-slate-500">Team Board</div>
            ) : (
              <div className="sr-only">Team Board</div>
            )}
            <Button
              variant="ghost"
              size="sm"
              aria-label={effectiveSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={effectiveSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => {
                setCollapseMode("manual");
                setSidebarCollapsed((v) => !v);
              }}
              disabled={Boolean(panel)}
              className={cn(effectiveSidebarCollapsed ? "h-8 w-8 px-0" : "h-8")}
            >
              {effectiveSidebarCollapsed ? "»" : "«"}
            </Button>
          </div>

          <nav className="mt-1 space-y-1">
            <button
              className={cn(
                navItem,
                effectiveSidebarCollapsed && "justify-center px-2",
                panel === "inbox" && navItemActive,
                inboxDropActive && "ring-2 ring-blue-500/20 ring-inset bg-blue-50/40",
                "w-full text-left"
              )}
              title={effectiveSidebarCollapsed ? "My Inbox" : undefined}
              onClick={() => setPanel((p) => (p === "inbox" ? null : "inbox"))}
              onDragOver={(e) => {
                // Use dragover (not just dragenter) so nested children don't break hover/timer.
                e.preventDefault();
                // When ⌥ is held, browsers often switch to "copy" drag UX.
                // We still perform a move-to-inbox; ⌥ is used as a modifier (keep assignee).
                e.dataTransfer.dropEffect = e.altKey ? "copy" : "move";
                if (!inboxDropActive) setInboxDropActive(true);
                if (!inboxHoverTimer.current) {
                  inboxHoverTimer.current = window.setTimeout(() => {
                    setPanel("inbox");
                  }, INBOX_LONG_HOVER_MS);
                }
              }}
              onDragEnter={() => {
                inboxDragDepth.current += 1;
                setInboxDropActive(true);
              }}
              onDragLeave={() => {
                inboxDragDepth.current -= 1;
                if (inboxDragDepth.current <= 0) {
                  inboxDragDepth.current = 0;
                  setInboxDropActive(false);
                  if (inboxHoverTimer.current) window.clearTimeout(inboxHoverTimer.current);
                  inboxHoverTimer.current = null;
                }
              }}
              onDrop={async (e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData("text/plain");
                if (!taskId) return;
                inboxDragDepth.current = 0;
                setInboxDropActive(false);
                if (inboxHoverTimer.current) window.clearTimeout(inboxHoverTimer.current);
                inboxHoverTimer.current = null;
                try {
                  // Default: clear assignee when moving to inbox. Hold ⌥ to keep assignee.
                  await updateTask({
                    id: taskId,
                    location: "inbox",
                    assigneeId: e.altKey ? undefined : null
                  });
                  // Maintain placements: move into the inbox list, and remove source placement unless ⌥ is held.
                  if (inboxListId) {
                    const raw = e.dataTransfer.getData("application/x-nxtup-task");
                    const payload = raw ? (JSON.parse(raw) as { taskId: string; fromListId?: string | null }) : null;
                    if (!e.altKey && payload?.fromListId && payload.fromListId !== inboxListId) {
                      await deleteTaskPlacementByTaskAndList({
                        workspaceId: workspaceId ?? "demo",
                        taskId,
                        listId: payload.fromListId
                      });
                    }
                    await createTaskPlacement({
                      workspaceId: workspaceId ?? "demo",
                      taskId,
                      listId: inboxListId,
                      createdBy: session.user.id
                    });
                    await qc.invalidateQueries({ queryKey: ["taskPlacements", workspaceId ?? "demo"] });
                  }
                  await qc.invalidateQueries({ queryKey: ["tasks", workspaceId ?? "demo"] });
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.error("[DnD] drop to inbox failed", err);
                }
                // Do not auto-open the Inbox drawer on drop; long-hover is the deliberate open gesture.
              }}
            >
              <Inbox size={18} className="text-slate-500" />
              {!effectiveSidebarCollapsed ? (
                <span className="flex w-full items-center justify-between gap-2">
                  <span>My Inbox</span>
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-medium text-slate-700">
                    {inboxCount}
                  </span>
                </span>
              ) : (
                <span className="sr-only">My Inbox</span>
              )}
            </button>
            <NavLink
              to={`${base}/board`}
              className={({ isActive }) =>
                cn(navItem, effectiveSidebarCollapsed && "justify-center px-2", isActive && navItemActive)
              }
              title={effectiveSidebarCollapsed ? "Team Board" : undefined}
            >
              <Trello size={18} className="text-slate-500" />
              {!effectiveSidebarCollapsed ? <span>Team Board</span> : <span className="sr-only">Team Board</span>}
            </NavLink>
            <NavLink
              to={`${base}/dashboard`}
              className={({ isActive }) =>
                cn(navItem, effectiveSidebarCollapsed && "justify-center px-2", isActive && navItemActive)
              }
              title={effectiveSidebarCollapsed ? "My Dashboard" : undefined}
            >
              <LayoutDashboard size={18} className="text-slate-500" />
              {!effectiveSidebarCollapsed ? <span>My Dashboard</span> : <span className="sr-only">My Dashboard</span>}
            </NavLink>
          </nav>

          <div className={cn("mt-6", sidebarCollapsed ? "px-1 py-2" : "px-2 py-2")}>
            {!sidebarCollapsed ? (
              <div className="text-xs font-medium text-slate-500">Workspace</div>
            ) : (
              <div className="sr-only">Workspace</div>
            )}
          </div>
          <nav className="mt-1 space-y-1">
            <NavLink
              to={`${base}/settings/members`}
              className={({ isActive }) =>
                cn(navItem, effectiveSidebarCollapsed && "justify-center px-2", isActive && navItemActive)
              }
              title={effectiveSidebarCollapsed ? "Members" : undefined}
            >
              <Users size={18} className="text-slate-500" />
              {!effectiveSidebarCollapsed ? <span>Members</span> : <span className="sr-only">Members</span>}
            </NavLink>
            <NavLink
              to={`${base}/settings/general`}
              className={({ isActive }) =>
                cn(navItem, effectiveSidebarCollapsed && "justify-center px-2", isActive && navItemActive)
              }
              title={effectiveSidebarCollapsed ? "Settings" : undefined}
            >
              <Settings size={18} className="text-slate-500" />
              {!effectiveSidebarCollapsed ? <span>Settings</span> : <span className="sr-only">Settings</span>}
            </NavLink>
          </nav>

          <div className="mt-6 border-t border-slate-100 pt-3" />

          <button
            className={cn(navItem, effectiveSidebarCollapsed && "justify-center px-2", "w-full")}
            title={effectiveSidebarCollapsed ? "Logout" : undefined}
          >
            <LogOut size={18} className="text-slate-500" />
            {!effectiveSidebarCollapsed ? <span>Logout</span> : <span className="sr-only">Logout</span>}
          </button>
        </aside>

        {panel ? (
          <ContextPanel
            panel={panel}
            pinned={panelPinned}
            width={panelWidth}
            onResize={setPanelWidth}
            onTogglePinned={() => setPanelPinned((p) => !p)}
            onClose={() => setPanel(null)}
            onSelectPanel={(next) => setPanel(next)}
          >
            {panel === "inbox" ? (
              <InboxPanel
                count={inboxCount}
                tasks={inboxTasks}
                display={displayPrefs}
                inboxListId={inboxListId}
                onOpenTask={(taskId) => {
                  // Open the task drawer by navigating to the board with a task query param.
                  nav(`${base}/board?task=${encodeURIComponent(taskId)}`);
                }}
                onDropTaskToInbox={async (taskId, opts) => {
                  await updateTask({
                    id: taskId,
                    location: "inbox",
                    assigneeId: opts.keepAssignee ? undefined : null
                  });
                  await qc.invalidateQueries({ queryKey: ["tasks", workspaceId ?? "demo"] });
                }}
              />
            ) : panel === "onlyme" ? (
              <div className="p-4">
                <div className="text-sm font-semibold text-slate-900">OnlyMe</div>
                <div className="mt-2 text-sm text-slate-600">
                  Placeholder tab for a future phase: a personal view of tasks relevant only to the current user.
                </div>
              </div>
            ) : panel === "raw" ? (
              <div className="p-4">
                <div className="text-sm font-semibold text-slate-900">Raw Mode</div>
                <div className="mt-2 text-sm text-slate-600">
                  Placeholder tab for a future phase: low-level/raw task stream and debugging views.
                </div>
              </div>
            ) : (
              <div className="p-4 text-sm text-slate-500">
                This panel is a placeholder for a future phase.
              </div>
            )}
          </ContextPanel>
        ) : null}

        {/* Main */}
        <main className="min-w-0 flex-1 bg-slate-50 h-full overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-6 py-6">
            <Outlet />

            <footer className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500">
              <span>© {new Date().getFullYear()} NXTUP. All rights reserved.</span>
              <span className="space-x-4">
                <a className="hover:text-slate-700" href="#">
                  Privacy Policy
                </a>
                <a className="hover:text-slate-700" href="#">
                  Terms of Service
                </a>
              </span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}


