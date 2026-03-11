# NXTUP — MVP Product Requirements Document

> **Version:** 1.0 (Fresh Start)
> **Date:** February 28, 2026
> **Author:** Jay Wolff
> **Build approach:** Solo developer + AI coding tools
> **Target timeline:** 2–3 weeks to functional MVP

---

## 1. Product Vision

NXTUP is a web-based task orchestration tool for agency leaders and team managers. Unlike traditional task managers that organize work into flat lists or kanban columns, NXTUP **anchors tasks to the people, projects, and meetings where they actually matter.**

The result: leaders walk into every interaction prepared, every follow-up lives in context, and team alignment emerges naturally — not through management overhead, but by design.

**One-line pitch:** *The task manager that organizes your work around your people and meetings, not the other way around.*

---

## 2. Target User

**Primary:** Agency executives, group heads, and team managers (5–50 person teams) who:
- Juggle multiple client accounts and internal initiatives simultaneously
- Have frequent 1:1s, team syncs, and client-facing meetings
- Value speed and simplicity over feature depth
- Are frustrated by tools that add overhead rather than reducing it

**Secondary:** Team members/contributors who receive and act on delegated tasks.

**Not targeting (MVP):** Individual productivity enthusiasts, enterprise orgs, or deeply technical/developer users.

---

## 3. Core Concept: Anchored Tasks

The central design principle of NXTUP is **anchoring**. Every task or note is attached to one or more **cards** — and cards represent real-world contexts:

| Card Type    | Example                        |
|-------------|-------------------------------|
| Teammate    | "Jesse", "Ruairi", "Lisa"     |
| Project     | "Project Pegasus", "Q2 Launch"|
| Meeting     | "Weekly Sync", "Client QBR"   |

**Key behaviors:**
- A task can be anchored to multiple cards (e.g., a task on both "Jesse" and "Project Pegasus")
- Tasks with no anchor live in the **Inbox/Backlog**
- If a card is deleted and a task is only anchored there, the task drops back to Inbox
- If a card is deleted but the task has other anchors, it remains visible on those cards

This is what differentiates NXTUP from every other task manager. The entire UI is built around this concept.

---

## 4. MVP Scope — What We're Building

### 4.1 In Scope (Phase 1)

#### Authentication & Accounts
- Email/password signup and login via Supabase Auth
- Single-user experience (personal workspace)
- Session persistence with JWT

#### Dashboard / Home
- Card grid layout showing all user's cards (teammates, projects, meetings)
- Each card displays: name, active task count, done task count
- Cards are draggable for user-defined ordering
- Sidebar navigation: Inbox, All Cards, + filtered views by card type
- Global search accessible via `Cmd/Ctrl+K`

#### Cards
- Create, rename, and delete cards
- Card types: Teammate, Project, Meeting (selectable on creation)
- Card detail view shows all anchored tasks, split into Active and Done sections

#### Tasks
- Create tasks via a clean modal/form (title, description, card assignment, tags)
- Assign task to one or more cards (anchor)
- Edit task inline (title, description, tags, card anchors)
- Mark task as Done (animates to Done section)
- Mark task as Not Done / Undo (returns to Active)
- Delete task (with confirmation)
- Drag-and-drop tasks between cards and to/from Inbox

#### Done Section (per card)
- **Collapsed by default** — shows a badge with done count and toggle arrow
- Expands to show a single-line-per-item list (truncated with ellipsis)
- On hover: tooltip shows full text and metadata
- On click: item expands inline to show full text, tags, completion date, who marked it done
- Expanded item is directly editable (text, tags, anchors)
- Only one item expanded at a time
- "Undo" button returns item to Active
- "Collapse" button closes the expanded item

#### Inbox / Backlog
- List of all unanchored tasks
- Drag tasks from Inbox to any card to anchor them
- Bulk-select and assign to a card

#### Tags
- Create tags on the fly when creating or editing tasks
- Tags are searchable and filterable
- Visual display as colored chips/badges

#### Global Search
- Triggered by `Cmd/Ctrl+K` or clicking search bar
- Searches across: task titles, descriptions, tags, card names
- Results grouped by card context
- Click result to navigate to the relevant card with task highlighted
- Real-time filtering as user types

#### UI / Visual Design
- Dark theme (default and only theme for MVP)
- shadcn/ui component library throughout
- Tailwind CSS for styling
- Clean, modern aesthetic — not explicitly "terminal" but developer-influenced
- Smooth animations for: task completion, drag-and-drop, Done section expand/collapse
- Toast notifications for all user actions (created, moved, completed, error)
- Responsive down to tablet (not mobile-optimized)
- Loading skeletons to prevent layout shift
- WCAG 2.1 AA accessibility compliance (4.5:1 contrast, keyboard nav, focus indicators)

### 4.2 Out of Scope (Phase 2+)

| Feature | Phase |
|---------|-------|
| Chrome extension / menu bar app | 2 |
| Multi-user / team collaboration | 2 |
| Real-time sync between users | 2 |
| Shared vs. private task visibility | 2 |
| `/slash` command system | 2 |
| Activity feed | 2 |
| Offline mode | 2 |
| Task version history | 2 |
| Calendar/Slack/Notion integrations | 3 |
| Mobile app | 3+ |
| Advanced permissions / org roles | 3+ |
| Import/export | 2 |
| Recurring tasks | 2 |

---

## 5. User Experience Flows

### 5.1 First-Time User
1. User signs up with email/password
2. Lands on empty dashboard with a welcome prompt
3. Guided to create their first card (e.g., a teammate or project)
4. Prompted to add their first task to that card
5. Brief tooltip tour highlighting: Inbox, search, Done toggle
6. Sample card + 2-3 sample tasks pre-populated as examples (deletable)

### 5.2 Daily Usage (Core Loop)
1. **Open dashboard** → see all cards at a glance with task counts
2. **Add task** → modal opens, type title, pick card(s), add tags → task appears on card
3. **Review a card** → click card to see all active tasks for that person/project/meeting
4. **Complete tasks** → click done → task animates to collapsed Done section
5. **Process Inbox** → drag unanchored items to the right cards
6. **Search** → `Cmd+K` → find any task, jump to its context

### 5.3 Card Deletion (Edge Case)
1. User deletes a card
2. System checks all tasks anchored to that card
3. Tasks with other anchors: remain visible on those other cards (no change)
4. Tasks with only this anchor: moved to Inbox with a toast notification ("3 tasks moved to Inbox")

---

## 6. Data Model

### Users
```
users
├── id (uuid, PK)
├── email (text, unique)
├── display_name (text)
├── created_at (timestamp)
└── updated_at (timestamp)
```

### Cards
```
cards
├── id (uuid, PK)
├── user_id (uuid, FK → users)
├── name (text)
├── card_type (enum: teammate, project, meeting)
├── sort_order (integer)
├── created_at (timestamp)
└── updated_at (timestamp)
```

### Tasks
```
tasks
├── id (uuid, PK)
├── user_id (uuid, FK → users)
├── title (text)
├── description (text, nullable)
├── is_done (boolean, default false)
├── done_at (timestamp, nullable)
├── done_by (uuid, nullable, FK → users)
├── sort_order (integer)
├── created_at (timestamp)
└── updated_at (timestamp)
```

### Task-Card Anchors (many-to-many)
```
task_cards
├── id (uuid, PK)
├── task_id (uuid, FK → tasks)
├── card_id (uuid, FK → cards)
└── created_at (timestamp)
```
*Unique constraint on (task_id, card_id)*

### Tags
```
tags
├── id (uuid, PK)
├── user_id (uuid, FK → users)
├── name (text)
├── color (text, nullable)
└── created_at (timestamp)
```
*Unique constraint on (user_id, name)*

### Task-Tag Assignments (many-to-many)
```
task_tags
├── id (uuid, PK)
├── task_id (uuid, FK → tasks)
├── tag_id (uuid, FK → tags)
└── created_at (timestamp)
```
*Unique constraint on (task_id, tag_id)*

---

## 7. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18+ with TypeScript | SPA architecture |
| UI Components | shadcn/ui | All primary components |
| Styling | Tailwind CSS | Dark theme, utility-first |
| State Management | Zustand | Client-side state, optimistic updates |
| Drag & Drop | @dnd-kit/core | Modern, accessible DnD |
| Animations | Framer Motion | Task transitions, Done expand/collapse |
| Backend/DB | Supabase (PostgreSQL) | Auth, database, Row Level Security |
| Data Fetching | TanStack Query (React Query) | Caching, optimistic updates |
| Search | PostgreSQL full-text search | Via Supabase, with tag/status filtering |
| Deployment | Vercel | Frontend hosting |
| Build Tool | Vite | Fast dev/build |

---

## 8. Component Map (shadcn/ui)

| UI Area | Components |
|---------|-----------|
| Dashboard layout | `NavigationMenu`, `Sidebar`, `Avatar`, `Button` |
| Card grid | `Card`, `Badge`, `DropdownMenu`, `Tooltip` |
| Card detail | `Card`, `Accordion`/`Collapsible`, `Badge`, `Checkbox` |
| Task item | `Checkbox`, `Badge`, `Button`, `Tooltip`, `Input`, `Textarea` |
| Done section | `Collapsible`, `Badge`, `Tooltip`, `Button` |
| Task creation | `Dialog`, `Input`, `Textarea`, `Select`, `Badge`, `Button` |
| Inbox | `Card`, `Checkbox`, `Button`, `Badge` |
| Search | `Command` (cmdk), `Badge`, `Button` |
| Tags | `Badge`, `Input`, `Popover` |
| Toasts | `Toast` / `Sonner` |
| Onboarding | `Dialog`, `Tooltip`, `Button` |
| Loading states | `Skeleton` |
| Settings | `Form`, `Input`, `Switch`, `Avatar` |

---

## 9. Key Interactions & Micro-UX

### Task Completion Animation
1. User clicks "Done" checkbox
2. Task fades/slides out of Active list (150ms ease)
3. Done badge count increments
4. Toast confirms: "Task completed" with Undo action
5. If Done section is expanded, task appears at top of Done list

### Drag and Drop
- Tasks are draggable between cards (re-anchoring)
- Tasks are draggable from Inbox to cards (anchoring)
- Drop zones highlight on hover
- Smooth physics-based transitions
- Auto-save on drop (optimistic update)

### Search (Cmd+K)
- Opens centered Command palette overlay
- Type-ahead with instant results
- Results grouped: Cards, Tasks, Tags
- Arrow keys to navigate, Enter to select
- Escape to dismiss

### Done Section Toggle
- Click collapsed badge → animates open (200ms)
- Single-line items with ellipsis truncation
- Hover → tooltip with full text
- Click item → expands inline (only one at a time)
- Expanded item: editable text, tags, anchors, undo button

---

## 10. Success Metrics (MVP)

| Metric | Target |
|--------|--------|
| Tasks created per user per week | 15+ |
| % of tasks anchored to at least one card | 80%+ |
| Task completion rate (within 7 days) | 60%+ |
| Daily active sessions | 5+ per week per user |
| Session duration | 3–8 minutes (focused usage) |
| Onboarding completion (first card + first task) | 90%+ |

---

## 11. Development Phases

### Phase 1: Core MVP (Weeks 1–3)
**Goal:** Functional web app with card-based task anchoring

- [ ] Supabase project setup (auth, database, RLS policies)
- [ ] Database schema and migrations
- [ ] Auth flow (signup, login, session management)
- [ ] Dashboard layout with sidebar navigation
- [ ] Card CRUD (create, rename, delete, reorder)
- [ ] Card detail view with active task list
- [ ] Task CRUD (create via modal, edit inline, delete)
- [ ] Task-to-card anchoring (multi-anchor support)
- [ ] Done/Undo functionality with collapsed Done section
- [ ] Done section expand/collapse with single-line truncation
- [ ] Done item expand-on-click with inline editing
- [ ] Inbox/Backlog view
- [ ] Drag-and-drop (tasks between cards, Inbox to card)
- [ ] Tagging system (create, assign, display)
- [ ] Global search (Cmd+K command palette)
- [ ] Toast notifications
- [ ] Dark theme styling
- [ ] Onboarding flow (welcome, sample data, tooltip tour)
- [ ] Deploy to Vercel

### Phase 2: Collaboration & Polish (Weeks 4–6)
- Multi-user auth and team workspaces
- Shared vs. private task visibility
- Real-time sync (Supabase Realtime)
- Task assignment to teammates
- Notification system
- Chrome extension (quick capture + search)
- Import/export
- Analytics and event tracking

### Phase 3+: Scale & Integrate
- Calendar integration
- Slack/Notion connectors
- Offline mode
- Mobile-responsive optimization
- Advanced search filters
- Recurring tasks
- Activity feed / audit log

---

## 12. File Structure (Recommended)

```
nxtup/
├── src/
│   ├── app/                    # Routes / pages
│   │   ├── auth/               # Login, signup
│   │   ├── dashboard/          # Main dashboard
│   │   ├── card/[id]/          # Card detail view
│   │   └── inbox/              # Inbox/backlog
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── cards/              # Card grid, card item, card detail
│   │   ├── tasks/              # Task item, task form, task list
│   │   ├── done/               # Done section, done item
│   │   ├── search/             # Command palette, search results
│   │   ├── inbox/              # Inbox list, drag targets
│   │   ├── tags/               # Tag badge, tag picker
│   │   ├── layout/             # Sidebar, header, app shell
│   │   └── onboarding/         # Welcome dialog, tooltips
│   ├── hooks/                  # Custom React hooks
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client config
│   │   ├── queries.ts          # TanStack Query hooks
│   │   └── utils.ts            # Helpers
│   ├── stores/                 # Zustand stores
│   │   ├── taskStore.ts
│   │   ├── cardStore.ts
│   │   └── uiStore.ts
│   └── types/                  # TypeScript interfaces
│       └── index.ts
├── supabase/
│   └── migrations/             # SQL migrations
├── public/
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

---

## 13. Supabase Row Level Security (RLS)

All tables must have RLS enabled. MVP policies (single-user):

```sql
-- Users can only see their own data
CREATE POLICY "Users see own cards"
  ON cards FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users see own tasks"
  ON tasks FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users see own tags"
  ON tags FOR ALL
  USING (auth.uid() = user_id);

-- Junction tables: user access via parent
CREATE POLICY "Users manage own task_cards"
  ON task_cards FOR ALL
  USING (
    EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_cards.task_id AND tasks.user_id = auth.uid())
  );

CREATE POLICY "Users manage own task_tags"
  ON task_tags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_tags.task_id AND tasks.user_id = auth.uid())
  );
```

---

## 14. Design Tokens (Dark Theme)

```css
/* Core palette — customize as needed */
--background: #0a0a0b;
--foreground: #fafafa;
--card: #141416;
--card-foreground: #fafafa;
--primary: #3b82f6;        /* Blue accent */
--primary-foreground: #fafafa;
--secondary: #1e1e22;
--muted: #27272a;
--muted-foreground: #a1a1aa;
--accent: #3b82f6;
--destructive: #ef4444;
--border: #27272a;
--ring: #3b82f6;
--radius: 0.5rem;

/* Typography */
font-family: 'Inter', system-ui, sans-serif;
font-mono: 'JetBrains Mono', monospace;  /* For tags/badges only */
```

---

## 15. Non-Functional Requirements

| Requirement | Target |
|------------|--------|
| Page load time | < 2 seconds |
| Task creation to render | < 200ms |
| Drag-and-drop response | < 100ms |
| Search results | < 300ms |
| Animation duration | 150–200ms |
| Accessibility | WCAG 2.1 AA |
| Browser support | Chrome, Firefox, Safari (latest 2 versions) |
| Uptime | 99.5% (Vercel + Supabase managed) |

---

*This document is the single source of truth for NXTUP MVP development. All features not listed in Section 4.1 are explicitly out of scope for Phase 1.*
