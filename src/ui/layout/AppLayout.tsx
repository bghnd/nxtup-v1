import React from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { Bell, Inbox, LayoutDashboard, LogOut, Settings, Trello, Users, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

import { cn } from "../lib/cn";
import { Avatar } from "../components/Avatar";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { useStubSession } from "../../auth/stubAuth";
import { listTasks, updateTask } from "../../data/api";
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
      const last = localStorage.getItem(PANEL_LAST_KEY) as PanelType | null;
      return last ?? null;
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
  const allTasks = tasksQ.data ?? [];
  const inboxTasks = allTasks.filter((t) => t.location === "inbox");
  const inboxCount = inboxTasks.length;
  const displayPrefs = React.useMemo(() => loadDisplayPrefs(), []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-blue-600 text-white">
              N
            </div>
            NXTUP
          </div>

          <div className="ml-4 hidden w-[460px] md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input className="pl-9" placeholder="Search tasks or assignees..." />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" aria-label="Search (mobile)" className="md:hidden">
              <Search size={18} />
            </Button>
            <Button variant="ghost" size="sm" aria-label="Notifications">
              <Bell size={18} />
            </Button>
            <div className="flex items-center gap-2">
              <select
                className="hidden h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 md:block"
                value={session.user.id}
                onChange={(e) => setUser(e.target.value)}
                aria-label="Switch user (stub)"
                title="Stub auth: switch active user"
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
              >
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
              <Avatar name={session.user.name} />
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "sticky top-14 h-[calc(100vh-3.5rem)] shrink-0 border-r border-slate-200 bg-white",
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
                const taskId = e.dataTransfer.getData("text/plain");
                if (!taskId) return;
                inboxDragDepth.current = 0;
                setInboxDropActive(false);
                if (inboxHoverTimer.current) window.clearTimeout(inboxHoverTimer.current);
                inboxHoverTimer.current = null;
                // Default: clear assignee when moving to inbox. Hold ⌥ to keep assignee.
                await updateTask({
                  id: taskId,
                  location: "inbox",
                  assigneeId: e.altKey ? undefined : null
                });
                await qc.invalidateQueries({ queryKey: ["tasks", workspaceId ?? "demo"] });
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
            ) : (
              <div className="p-4 text-sm text-slate-500">
                This panel is a placeholder for a future phase.
              </div>
            )}
          </ContextPanel>
        ) : null}

        {/* Main */}
        <main className="min-w-0 flex-1 bg-slate-50">
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


