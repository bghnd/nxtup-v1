# NXTUP — Living Product Requirements Document

> This document is updated at the end of every working session ("landing the plane"). It is the canonical source of product vision, settled decisions, and in-progress thinking. It is not a spec — it evolves.

---

## 1. What Is NXTUP?

NXTUP is a **command surface for executives and upper management** to triage, delegate, and plan the work of their team — including human reports, managers, directors, and AI agents.

It is built around a single primary workflow:

> **Everything lands in the Inbox → the exec (or their agent) immediately moves it to a person, a time slot, or a meeting.**

The Inbox is a funnel, not a folder. Its job is to be emptied.

---

## 2. Core Product Philosophy

- **Inbox Zero as a habit** — the platform is designed so that nothing lives in the inbox for long. Every item either gets promoted (placed on a person, time, or meeting) or discarded.
- **People, Time, and Meetings as first-class placement targets** — triaging a task means assigning it to one of: a person's card, a calendar time slot, or an upcoming meeting agenda.
- **Agents are first-class participants** — every user (including the exec) works alongside 2+ AI agents. Agents are not tools; they are collaborators with their own "seats" in the workflow.
- **The command surface is the stickiness** — once inbox triage becomes habitual, the real value is the live map of org capacity, timing, and attention the platform provides.

---

## 3. Primary User Persona

**The Executive (current user, "the boss"):**
- Manages focus, channel capacity, and timing of their team AND their AI agents
- Has direct reports who are all active platform participants (paid seats)
- Some reports may have junior managers under them, also on the platform
- Individual contributors (designers, devs, writers, etc.) may NOT be on the platform — the exec/managers represent their work
- Deals with inputs from every channel: Slack, email, Asana, Linear, calendar invites, direct reports, agent outputs

---

## 4. The Four Entities in the System

Every piece of information in NXTUP maps to one of these four entities:

| Entity | Description |
|---|---|
| 👤 **People** | Reports, managers, directors, external contacts — anyone the exec works with |
| 🤖 **Agents** | AI collaborators assigned to the exec and/or their reports. First-class participants. |
| 📅 **Time Slots** | Pre-allocated blocks on the exec's weekly calendar (morning focus, wrap-up, etc.) |
| 🗓️ **Meetings** | Scheduled calendar events — 1:1s, standups, retrospectives, client calls |

---

## 5. The Workflow Prompt (AI Chat Bar)

The **Workflow Prompt** is the always-present floating chat bar at the bottom of the screen. It is:

- The executive's direct communication channel with their **Executive Agent**
- Always visible regardless of which panel or view is open (floats at `bottom-6`, left-aligned to the main content area)
- Monitored by the agent in real time, alongside the Inbox

The agent watches two streams simultaneously:
1. **The Inbox** — to triage arriving tasks automatically or with suggestions
2. **The Workflow Prompt** — to act on exec's direct commands and briefings

---

## 6. Application Views (Current & Planned)

### 6a. Current Views
- **Board** (`/w/:id/board`) — workspace kanban board with lists, tasks, groups ✅
- **Inbox Panel** — right-side context panel for triaging tasks ✅
- **Dashboard** (`/w/:id/dashboard`) — placeholder, to be defined ✅

### 6b. Planned Views

#### "My Plan" / Horizon View (3rd nav item)
A **temporal command surface** — the exec's view across people, time, and meetings.

- **Not a calendar** — time-horizon buckets, not date-specific slots
- Columns: `Recent Work` | `Now (Current Sprint)` | `Next 2 Weeks` | `Future`
- **Scope:** Team-wide — shows tasks for all managed reports, directs, and agents
- **Task source:** All tasks in the system, organized by assignee (person or agent). Tasks auto-surface here, and exec can DnD to replan.
- **"Now" column:** Manually curated — the exec promotes tasks into horizons. Due dates may suggest placement but the exec controls it.
- **Person Cards:** When you attach a task to a person (Jesse, Maggie), it aggregates on their card. Opening their card before a meeting shows all open items tagged to them.
- **Primary value:** After inbox triage, this becomes the capacity planning command surface.

**Nav label:** **Horizon** ✅

#### Analytics Page
- Located in the left nav under Settings
- Provides org-level reporting on task throughput, capacity, bottlenecks, agent activity, etc.
- Exact metrics TBD

---

## 7. Left Nav Structure (Planned)

```
My Inbox          ← triage queue
My Dashboard      ← personal view (TBD)
Horizon           ← temporal command surface (to build) ✅ label settled
──────────────────
Workspaces
  [Workspace name]
  + New workspace
──────────────────
Settings
  Members
  Settings
  [Analytics]     ← to build
  Logout
```

---

## 8. Workspace Defaults

New workspaces will not start empty. They will bootstrap with at least two default boards:

- **Team board** — internal work, sprints, team tasks
- **Client board** — external-facing work, deliverables, client-specific tasks

---

## 9. Technical Decisions (Settled)

- **Frontend:** React + TypeScript + Vite + TailwindCSS
- **Backend:** Supabase (auth + database)
- **State:** Zustand + React Query
- **DnD:** react-dnd
- **Branch:** `experiment/ui-and-search`

---

## 10. Open Questions

- [x] ~~What is the final nav label for the Horizon/Plan view?~~ → **Horizon** ✅
- [ ] How are Agents represented structurally in the data model? Same as users with a flag?
- [ ] How do calendar integrations (Google Cal, Outlook) feed into Time Slots and Meetings?
- [ ] What metrics appear on the Analytics page?
- [ ] Dashboard view — what does it show? (differs from Horizon how?)

---

## 11. UI Affordance Language (Settled)

One consistent visual language across all add/create affordances on the board:

| Affordance | Default | Hover |
|---|---|---|
| Add task (card bottom) | `+` always visible in `text-muted`, no line | line appears `bg-border`, `+` brightens |
| Add list (between cards) | Tall narrow strip, left-edge dashed `border-border` only, faint `+` | border brightens, `+` brightens |
| Group separator | Full-width line `bg-border`, no `+` | `+` fades in at far left |
| Add group (board bottom) | Full-width rect, top-edge dashed only, no `+` | `+` fades in centered |

- Color token for all: `text-muted` / `border-border` (matches group meta text + dividers)
- All `+` icons: size 12–13 (uniform)
- No labels on any affordance element

---

*Last updated: 2026-03-08 by session with JayPro*
