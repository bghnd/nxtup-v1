import React from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { Bell, Inbox, LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen, Plus, Settings, Users, Moon, Sun } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

import { cn } from "../lib/cn";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { InlineEditableText } from "../components/InlineEditableText";
import { SupabaseAuthModal } from "../components/SupabaseAuthModal";
import { useStubSession } from "../../auth/stubAuth";
import { consumeSupabaseRedirectFromUrl, getSupabaseSession, onSupabaseAuthChange } from "../../auth/supabaseAuth";
import { ensureSupabaseDemoWorkspace, getLastSupabaseWorkspaceId } from "../../auth/supabaseBootstrap";
import {
  createWorkspace,
  createTaskPlacement,
  deleteTaskPlacementByTaskAndList,
  listWorkspaces,
  listTaskLists,
  listTasks,
  listGlobalTasks,
  updateWorkspace,
  updateTask
} from "../../data/client";
import { getAdapterKind, useMockAdapter, useSupabaseAdapter } from "../../data/adapter";
import { ContextPanel, type PanelType } from "./contextPanel/ContextPanel";
import { InboxPanel } from "./contextPanel/InboxPanel";
import { IndexPanel } from "./contextPanel/IndexPanel";
import { loadDisplayPrefs } from "../state/displayPrefs";
import { GlobalSearchModal } from "../components/GlobalSearchModal";
import { WorkflowPrompt } from "../components/WorkflowPrompt";
import { getUniqueName } from "../../utils/nameUtils";

const COLLAPSED_KEY = "nxtup.sidebar.collapsed.v1";
const COLLAPSE_MODE_KEY = "nxtup.sidebar.collapseMode.v1"; // "auto" | "manual"
const PANEL_PINNED_KEY = "nxtup.panel.pinned.v1";
const PANEL_LAST_KEY = "nxtup.panel.last.v1";
const PANEL_WIDTH_KEY = "nxtup.panel.width.v1";

const navItem =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground-muted hover:bg-accent-hover";

const navItemActive = "bg-accent text-foreground font-medium";

export function AppLayout() {
  const { workspaceId } = useParams();
  const base = workspaceId ? `/w/${workspaceId}` : "/w/demo";
  const { session, setUser, setRealUser, setWorkspaceRole, allUsers } = useStubSession();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [authOpen, setAuthOpen] = React.useState(false);
  const [supabaseEmail, setSupabaseEmail] = React.useState<string | null>(null);
  const [adapterKind, setAdapterKind] = React.useState<"mock" | "supabase">(() => getAdapterKind());
  const inboxHoverTimer = React.useRef<number | null>(null);
  const [inboxDropActive, setInboxDropActive] = React.useState(false);
  const inboxDragDepth = React.useRef(0);
  const INBOX_LONG_HOVER_MS = 1200;

  const [theme, setTheme] = React.useState<"light" | "dark">(() => {
    try {
      const stored = localStorage.getItem("nxtup.theme.v1");
      if (stored === "light" || stored === "dark") return stored;
      // Linear defaults to dark visually, so we'll lean dark if no preference
      return "dark";
    } catch {
      return "dark";
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem("nxtup.theme.v1", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {
      // ignore
    }
  }, [theme]);

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
      if (last === "inbox" || last === "activity" || last === "saved") return last;
      // Back-compat for older saved panel ids.
      if (last === "onlyme") return "activity";
      if (last === "raw") return "saved";
      return "inbox";
    } catch {
      return null;
    }
  });

  const [indexFilter, setIndexFilter] = React.useState<"alpha" | "recent" | "unlisted">("alpha");

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
    return false; // Force open
    /*
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
    */
  });

  // While any context panel is open, L1 must be rail-collapsed (icon-only).
  // const effectiveSidebarCollapsed = panel ? true : sidebarCollapsed;
  const effectiveSidebarCollapsed = sidebarCollapsed;
  const collapseButtonLabel = panel
    ? "Close panel and expand sidebar"
    : effectiveSidebarCollapsed
      ? "Expand sidebar"
      : "Collapse sidebar";

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
  const globalTasksQ = useQuery({
    queryKey: ["globalTasks"],
    queryFn: () => listGlobalTasks()
  });
  const listsQ = useQuery({
    queryKey: ["taskLists", workspaceId ?? "demo"],
    queryFn: () => listTaskLists(workspaceId ?? "demo")
  });
  const workspacesQ = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => listWorkspaces()
  });
  const allTasks = tasksQ.data ?? [];
  const allGlobalTasks = globalTasksQ.data ?? [];
  const inboxTasks = allGlobalTasks.filter((t) => t.location === "inbox");
  const inboxCount = inboxTasks.length;
  const displayPrefs = React.useMemo(() => loadDisplayPrefs(), []);
  const inboxListId = (listsQ.data ?? []).find((l) => l.type === "inbox")?.id ?? null;
  const workspaces = workspacesQ.data ?? [];

  const [createWsOpen, setCreateWsOpen] = React.useState(false);
  const [createWsName, setCreateWsName] = React.useState("");

  React.useEffect(() => {
    const useSupabase = (import.meta.env.VITE_USE_SUPABASE as string | undefined) === "1";
    if (!useSupabase) return;

    let alive = true;
    async function refresh() {
      // If we just returned from a magic-link redirect, exchange ?code=... for a real session.
      await consumeSupabaseRedirectFromUrl();

      const s = await getSupabaseSession();
      const email = s.data.session?.user?.email ?? null;
      const uid = s.data.session?.user?.id;
      if (!alive) return;
      setSupabaseEmail(email);

      if (email && uid) {
        setRealUser({ id: uid, name: email.split("@")[0] || "User", email, avatarUrl: undefined });
        useSupabaseAdapter();
        setAdapterKind(getAdapterKind());

        // Ensure there's a workspace to land in.
        // If this fails (e.g., RLS error), stay in Supabase mode but don't navigate.
        try {
          const wsId = await ensureSupabaseDemoWorkspace();
          if (!alive) return;
          // If we're still on /w/demo/*, redirect to the real workspace.
          if (!workspaceId || workspaceId === "demo") {
            nav(`/w/${wsId}/board`, { replace: true });
          }
        } catch (err) {
          console.error("Failed to ensure workspace:", err);
          // Stay in Supabase mode but don't navigate away from current page
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
    <div className="h-screen overflow-hidden bg-background">
      {/* Top bar removed from here, moving Logo into Sidebar and Buttons into Main */}

      {/* End previous Top Bar area */}

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
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "h-full shrink-0 border-r border-border bg-card overflow-hidden flex flex-col z-10 dark:shadow-card-dark",
            effectiveSidebarCollapsed ? "w-[76px] px-2" : "w-[240px] px-3"
          )}
        >
          {/* Logo container at the top of Sidebar */}
          <div className={cn("flex items-center h-14 pl-1", effectiveSidebarCollapsed ? "justify-center" : "justify-start")}>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground cursor-pointer" onClick={() => nav("/")}>
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-white">
                N
              </div>
              {!effectiveSidebarCollapsed && <span>NXTUP</span>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-3">
            {/* Nav aligned to match the description byline in the Board/Inbox headers */}
            <nav className="mt-[49px] space-y-1">
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
                <Inbox size={18} className="text-muted-foreground" />
                {!effectiveSidebarCollapsed ? (
                  <span className="flex w-full items-center justify-between gap-2">
                    <span>My Inbox</span>
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-2 text-xs font-medium text-foreground-muted">
                      {inboxCount}
                    </span>
                  </span>
                ) : (
                  <span className="sr-only">My Inbox</span>
                )}
              </button>
              <NavLink
                to={`${base}/dashboard`}
                className={({ isActive }) =>
                  cn(navItem, effectiveSidebarCollapsed && "justify-center px-2", isActive && navItemActive)
                }
                title={effectiveSidebarCollapsed ? "My Dashboard" : undefined}
              >
                <LayoutDashboard size={18} className="text-muted-foreground" />
                {!effectiveSidebarCollapsed ? <span>My Dashboard</span> : <span className="sr-only">My Dashboard</span>}
              </NavLink>
            </nav>

            <div className={cn("mt-6", effectiveSidebarCollapsed ? "px-1 py-2" : "px-2 py-2")}>
              {!effectiveSidebarCollapsed ? (
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-muted-foreground">Workspaces</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Start new workspace"
                    title="Start new workspace"
                    className="h-7 w-7 px-0"
                    onClick={() => {
                      setCreateWsOpen((v) => !v);
                      setCreateWsName("");
                    }}
                  >
                    <Plus size={16} className="text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <div className="sr-only">Workspaces</div>
              )}
            </div>

            {createWsOpen && !effectiveSidebarCollapsed ? (
              <div className="px-2">
                <input
                  className="h-8 w-full rounded-lg border border-border bg-card px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Workspace name…"
                  value={createWsName}
                  onChange={(e) => setCreateWsName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setCreateWsOpen(false);
                      setCreateWsName("");
                      return;
                    }
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const nameInput = createWsName.trim();
                    if (!nameInput.length) return;
                    const existingNames = workspaces.map((w: any) => w.name);
                    const finalName = getUniqueName(nameInput, existingNames);
                    const ws = await createWorkspace({ name: finalName });
                    await qc.invalidateQueries({ queryKey: ["workspaces"] });
                    setCreateWsOpen(false);
                    setCreateWsName("");
                    nav(`/w/${ws.id}/board`);
                  }}
                />
                <div className="mt-1 text-[11px] text-muted-foreground">Enter to create • Esc to cancel</div>
              </div>
            ) : null}

            <nav className="mt-2 space-y-1">
              {workspaces.map((w: any) => {
                const active = (workspaceId ?? "demo") === w.id;
                return (
                  <button
                    key={w.id}
                    className={cn(
                      navItem,
                      effectiveSidebarCollapsed && "justify-center px-2",
                      active && navItemActive,
                      "w-full text-left"
                    )}
                    onClick={() => nav(`/w/${w.id}/board`)}
                    title={effectiveSidebarCollapsed ? w.name : undefined}
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-xs font-semibold text-muted-foreground">
                      {(w.name?.trim()?.[0] ?? "W").toUpperCase()}
                    </div>
                    {!effectiveSidebarCollapsed ? (
                      <InlineEditableText
                        value={w.name}
                        ariaLabel={`Rename workspace ${w.name}`}
                        className="text-sm font-medium text-foreground-muted"
                        onConfirm={async (next) => {
                          await updateWorkspace({ id: w.id, name: next });
                          await qc.invalidateQueries({ queryKey: ["workspaces"] });
                        }}
                      />
                    ) : (
                      <span className="sr-only">{w.name}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom settings group */}
          <div className={cn("border-t border-border pt-3", effectiveSidebarCollapsed ? "pb-3" : "pb-4")}>
            {!effectiveSidebarCollapsed ? (
              <div className="px-2 pb-2 text-xs font-medium text-muted-foreground">Settings</div>
            ) : (
              <div className="sr-only">Settings</div>
            )}
            <nav className="space-y-1">
              <NavLink
                to={`${base}/settings/members`}
                className={({ isActive }) =>
                  cn(navItem, effectiveSidebarCollapsed && "justify-center px-2", isActive && navItemActive)
                }
                title={effectiveSidebarCollapsed ? "Members" : undefined}
              >
                <Users size={18} className="text-muted-foreground" />
                {!effectiveSidebarCollapsed ? <span>Members</span> : <span className="sr-only">Members</span>}
              </NavLink>
              <NavLink
                to={`${base}/settings/general`}
                className={({ isActive }) =>
                  cn(navItem, effectiveSidebarCollapsed && "justify-center px-2", isActive && navItemActive)
                }
                title={effectiveSidebarCollapsed ? "Settings" : undefined}
              >
                <Settings size={18} className="text-muted-foreground" />
                {!effectiveSidebarCollapsed ? <span>Settings</span> : <span className="sr-only">Settings</span>}
              </NavLink>

              <button
                className={cn(navItem, effectiveSidebarCollapsed && "justify-center px-2", "w-full text-left")}
                title={effectiveSidebarCollapsed ? "Logout" : undefined}
                onClick={() => {
                  // Stub logout placeholder (real logout lives in Supabase modal today).
                  setAuthOpen(true);
                }}
              >
                <LogOut size={18} className="text-muted-foreground" />
                {!effectiveSidebarCollapsed ? <span>Logout</span> : <span className="sr-only">Logout</span>}
              </button>
            </nav>
          </div>
        </aside>

        {panel ? (
          <ContextPanel
            panel={panel}
            pinned={panelPinned}
            width={panelWidth}
            indexFilter={indexFilter}
            onIndexFilterChange={setIndexFilter}
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
                onOpenTask={(taskId) => {
                  nav(`${base}/board?task=${encodeURIComponent(taskId)}`);
                }}
                onDropTaskToInbox={async (taskId, opts) => {
                  await updateTask({
                    id: taskId,
                    location: "inbox",
                    assigneeId: opts.keepAssignee ? undefined : null
                  });
                  await qc.invalidateQueries({ queryKey: ["tasks", workspaceId ?? "demo"] });
                  await qc.invalidateQueries({ queryKey: ["globalTasks"] });
                }}
              />
            ) : panel === "activity" ? (
              <div className="p-4">
                <div className="text-sm font-semibold text-foreground">To-Do List</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Tasks you have accepted responsibility for. Scheduled and unscheduled items for you to tackle.
                </div>
              </div>
            ) : panel === "saved" ? (
              <div className="p-4">
                <div className="text-sm font-semibold text-foreground">Activity Log</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  A chronological movement of tasks in and around the system. A raw feed and log across all participants.
                </div>
              </div>
            ) : panel === "index" ? (
              <IndexPanel
                tasks={allGlobalTasks}
                filter={indexFilter}
                display={displayPrefs}
                onOpenTask={(taskId) => {
                  nav(`${base}/board?task=${encodeURIComponent(taskId)}`);
                }}
              />
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                This panel is a placeholder for a future phase.
              </div>
            )}
          </ContextPanel>
        ) : null}

        {/* Main */}
        <main className="min-w-0 flex-1 bg-background h-full overflow-y-auto flex flex-col relative w-full">
          {/* Top bar moved inside Main Content, absolutely positioned or sticky *over* content */}
          <header className="sticky top-0 z-10 bg-transparent pointer-events-none">
            {/* pointer-events-none so we can click through empty space, but buttons need pointer-events-auto */}
            <div className="w-full h-14 flex items-center justify-end px-4">
              <div className="flex items-center gap-2 pointer-events-auto mt-2 mr-2">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Toggle theme"
                  title="Toggle theme"
                  onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                  className="bg-card/50 backdrop-blur-sm shadow-sm border border-border/50"
                >
                  {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </Button>
                <Button variant="ghost" size="sm" aria-label="Notifications" className="bg-card/50 backdrop-blur-sm shadow-sm border border-border/50">
                  <Bell size={18} />
                </Button>
                <div
                  className={cn(
                    "hidden md:flex items-center rounded-full border px-2.5 py-1 text-xs font-medium bg-card/50 backdrop-blur-sm shadow-sm border-border/50",
                    adapterKind === "supabase"
                      ? "text-emerald-700 font-bold"
                      : "text-foreground-muted"
                  )}
                  title="Active backend for reads/writes"
                >
                  Backend: {adapterKind === "supabase" ? "Supabase" : "Mock"}
                </div>
                {(import.meta.env.VITE_USE_SUPABASE as string | undefined) === "1" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-card/50 backdrop-blur-sm shadow-sm border border-border/50"
                    onClick={() => setAuthOpen(true)}
                    title={supabaseEmail ? "Supabase auth: signed in" : "Supabase auth: sign in"}
                  >
                    {supabaseEmail ? "Supabase ✓" : "Sign in"}
                  </Button>
                ) : null}
                <div className="flex items-center gap-2">
                  <select
                    className="hidden h-9 rounded-md border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm px-3 text-sm text-foreground-muted md:block focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
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
                    className="hidden h-9 rounded-md border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm px-3 text-sm text-foreground-muted md:block focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
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
                  <div className="bg-card/50 backdrop-blur-sm shadow-sm rounded-full p-0.5 border border-border/50">
                    <Avatar name={supabaseEmail ?? session.user.name} />
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="w-full flex-grow mx-auto px-6 py-2 pb-6 flex flex-col">
            <Outlet />
            <div className="flex-grow min-h-[4rem]" />
            <footer className="mt-8 flex items-center justify-between border-t border-border pt-4 pb-4 text-xs text-muted-foreground mt-auto">
              <span>© {new Date().getFullYear()} NXTUP. All rights reserved.</span>
              <span className="space-x-4">
                <a className="hover:text-foreground-muted" href="#">
                  Privacy Policy
                </a>
                <a className="hover:text-foreground-muted" href="#">
                  Terms of Service
                </a>
              </span>
            </footer>
          </div>
        </main>
      </div>
      <GlobalSearchModal />
      {/* Workflow Prompt — always-present floating chat bar, left-aligned to main content */}
      <div
        className="fixed bottom-6 z-50"
        style={{
          left: (effectiveSidebarCollapsed ? 76 : 240) + (panel ? panelWidth : 0) + 24,
          right: 24,
          maxWidth: 680,
        }}
      >
        <WorkflowPrompt />
      </div>
    </div>
  );
}


