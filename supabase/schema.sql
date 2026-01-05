-- NXTUP MVP schema draft (Supabase/Postgres)
-- Note: Auth is stubbed in the frontend initially, but this schema assumes eventual
-- Supabase Auth where profiles.id == auth.users.id (uuid).

-- Enable useful extensions (safe defaults)
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- =========================
-- Profiles
-- =========================
create table if not exists public.profiles (
  id uuid primary key,
  email text unique,
  name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- =========================
-- Workspaces + membership
-- =========================
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

do $$ begin
  create type public.workspace_role as enum ('owner', 'admin', 'member');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.membership_status as enum ('active', 'invited', 'removed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null default 'member',
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  primary key (workspace_id, profile_id)
);

-- =========================
-- Invites (email-based)
-- =========================
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'member',
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists invites_workspace_id_idx on public.invites(workspace_id);
create index if not exists invites_email_idx on public.invites(email);

-- =========================
-- Tags
-- =========================
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

-- =========================
-- Tasks
-- =========================
do $$ begin
  create type public.task_priority as enum ('low', 'medium', 'high', 'critical');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_status as enum ('active', 'done', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_location as enum ('inbox', 'board');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  location public.task_location not null default 'inbox',
  title text not null,
  description text,
  priority public.task_priority not null default 'medium',
  due_date date,
  status public.task_status not null default 'active',
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists tasks_workspace_id_idx on public.tasks(workspace_id);
create index if not exists tasks_location_idx on public.tasks(location);
create index if not exists tasks_assignee_id_idx on public.tasks(assignee_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_due_date_idx on public.tasks(due_date);

-- =========================
-- Task Groups / Lists / Placements (multi-placement foundation)
-- =========================
do $$ begin
  create type public.task_list_type as enum ('inbox', 'person', 'project', 'time_slot', 'calendar_event', 'other');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.task_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists task_groups_workspace_id_idx on public.task_groups(workspace_id);

create table if not exists public.task_lists (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  -- null for non-board lists like Inbox (shown in the L2 context panel)
  group_id uuid references public.task_groups(id) on delete cascade,
  type public.task_list_type not null,
  ref_id text,
  title text not null,
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists task_lists_workspace_id_idx on public.task_lists(workspace_id);
create index if not exists task_lists_group_id_idx on public.task_lists(group_id);

create table if not exists public.task_placements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  list_id uuid not null references public.task_lists(id) on delete cascade,
  position bigint not null default 0,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (task_id, list_id)
);

create index if not exists task_placements_workspace_id_idx on public.task_placements(workspace_id);
create index if not exists task_placements_list_id_position_idx on public.task_placements(list_id, position);
create index if not exists task_placements_task_id_idx on public.task_placements(task_id);

-- Task <-> tags
create table if not exists public.task_tags (
  task_id uuid not null references public.tasks(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

-- Checklist
create table if not exists public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists task_checklist_items_task_id_idx on public.task_checklist_items(task_id);

-- Comments
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists task_comments_task_id_idx on public.task_comments(task_id);

-- =========================
-- RLS (Phase 2 when real auth is enabled)
-- =========================
-- NOTE: These are baseline policies suitable for early MVP testing.
-- Tighten later for roles, shared views, and invite flows.

create or replace function public.is_workspace_member(wid uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.workspace_members m
    where m.workspace_id = wid
      and m.profile_id = auth.uid()
      and m.status = 'active'
  );
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invites enable row level security;
alter table public.tasks enable row level security;
alter table public.task_groups enable row level security;
alter table public.task_lists enable row level security;
alter table public.task_placements enable row level security;

-- Workspaces: members can read; any authenticated user can create a workspace.
drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member"
on public.workspaces
for select
to authenticated
using (public.is_workspace_member(id));

drop policy if exists "workspaces_insert_authenticated" on public.workspaces;
create policy "workspaces_insert_authenticated"
on public.workspaces
for insert
to authenticated
with check (created_by = auth.uid());

-- Members: members can read membership; only the workspace creator can manage membership (MVP baseline).
drop policy if exists "workspace_members_select_member" on public.workspace_members;
create policy "workspace_members_select_member"
on public.workspace_members
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace_members_manage_owner" on public.workspace_members;
create policy "workspace_members_manage_owner"
on public.workspace_members
for all
to authenticated
using (auth.uid() = (select w.created_by from public.workspaces w where w.id = workspace_id))
with check (auth.uid() = (select w.created_by from public.workspaces w where w.id = workspace_id));

-- Invites: only workspace creator can manage invites (MVP baseline).
drop policy if exists "invites_manage_owner" on public.invites;
create policy "invites_manage_owner"
on public.invites
for all
to authenticated
using (auth.uid() = (select w.created_by from public.workspaces w where w.id = workspace_id))
with check (auth.uid() = (select w.created_by from public.workspaces w where w.id = workspace_id));

-- Tasks + placements: any active member of the workspace can CRUD (MVP baseline).
drop policy if exists "tasks_crud_member" on public.tasks;
create policy "tasks_crud_member"
on public.tasks
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "task_groups_crud_member" on public.task_groups;
create policy "task_groups_crud_member"
on public.task_groups
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "task_lists_crud_member" on public.task_lists;
create policy "task_lists_crud_member"
on public.task_lists
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "task_placements_crud_member" on public.task_placements;
create policy "task_placements_crud_member"
on public.task_placements
for all
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));



