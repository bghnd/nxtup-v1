import type {
  Invite,
  Profile,
  Task,
  TaskGroup,
  TaskList,
  TaskPlacement,
  TaskParticipant,
  Workspace,
  WorkspaceMember
} from "../domain/types";

export const demoWorkspace: Workspace = {
  id: "demo",
  name: "Design Sprint",
  createdBy: "p_alice"
};

export const demoProfiles: Profile[] = [
  {
    id: "p_alice",
    name: "Alice Johnson",
    email: "alice@nxtup.dev",
    avatarUrl: null
  },
  {
    id: "p_bob",
    name: "Bob Williams",
    email: "bob@nxtup.dev",
    avatarUrl: null
  },
  {
    id: "p_charlie",
    name: "Charlie Green",
    email: "charlie@nxtup.dev",
    avatarUrl: null
  }
];

export const demoMembers: WorkspaceMember[] = [
  { workspaceId: "demo", profileId: "p_alice", role: "owner", status: "active" },
  { workspaceId: "demo", profileId: "p_bob", role: "member", status: "active" },
  { workspaceId: "demo", profileId: "p_charlie", role: "member", status: "active" }
];

const now = new Date().toISOString();

export const demoInvites: Invite[] = [
  {
    id: "i_demo",
    workspaceId: "demo",
    email: "new.user@nxtup.dev",
    role: "member",
    token: "demo-token-123",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    acceptedAt: null,
    createdBy: "p_alice",
    createdAt: now
  }
];

export const demoTaskGroups: TaskGroup[] = [
  {
    id: "g_core_team",
    workspaceId: "demo",
    title: "My Core Team",
    description: "People lists for day-to-day delivery and accountability.",
    sortOrder: 100
  },
  {
    id: "g_planning",
    workspaceId: "demo",
    title: "Planning",
    description: "Project + time-slot lists (MVP mock types).",
    sortOrder: 200
  }
];

export const demoTaskLists: TaskList[] = [
  // Inbox (L2 panel)
  {
    id: "l_inbox",
    workspaceId: "demo",
    groupId: null,
    type: "inbox",
    title: "Inbox",
    sortOrder: 0
  },
  // Core team people lists
  {
    id: "l_person_alice",
    workspaceId: "demo",
    groupId: "g_core_team",
    type: "person",
    refId: "p_alice",
    title: "Alice",
    sortOrder: 100
  },
  {
    id: "l_person_bob",
    workspaceId: "demo",
    groupId: "g_core_team",
    type: "person",
    refId: "p_bob",
    title: "Bob",
    sortOrder: 200
  },
  {
    id: "l_person_charlie",
    workspaceId: "demo",
    groupId: "g_core_team",
    type: "person",
    refId: "p_charlie",
    title: "Charlie",
    sortOrder: 300
  },
  // MVP mock list types
  {
    id: "l_project_demo",
    workspaceId: "demo",
    groupId: "g_planning",
    type: "project",
    refId: "proj_nxtup_launch",
    title: "Project: NXTUP Launch",
    sortOrder: 100
  },
  {
    id: "l_time_first_thing_tomorrow",
    workspaceId: "demo",
    groupId: "g_planning",
    type: "time_slot",
    refId: "timeslot_first_thing_tomorrow",
    title: "Time Slot: First Thing Tomorrow",
    sortOrder: 200
  }
];

export const demoTaskPlacements: TaskPlacement[] = [];

export const demoTaskParticipants: TaskParticipant[] = [];

export const demoTasks: Task[] = [
  {
    id: "t_inbox_1",
    workspaceId: "demo",
    location: "inbox",
    title: "Inbox: Triage partner outreach list (Maggie)",
    priority: "medium",
    dueDate: "2024-08-06",
    assigneeId: null,
    createdBy: "p_alice",
    updatedAt: now,
    checklist: { total: 0, done: 0 },
    commentsCount: 0,
    tags: ["inbox"]
  },
  {
    id: "t_inbox_2",
    workspaceId: "demo",
    location: "inbox",
    title: "Inbox: Draft kickoff agenda for Monday standup",
    priority: "low",
    dueDate: undefined,
    assigneeId: "p_bob",
    createdBy: "p_alice",
    updatedAt: now,
    checklist: { total: 0, done: 0 },
    commentsCount: 0,
    tags: ["inbox"]
  },
  {
    id: "t_auth",
    workspaceId: "demo",
    location: "board",
    title: "Implement user authentication module",
    priority: "high",
    dueDate: "2024-08-15",
    assigneeId: "p_alice",
    createdBy: "p_alice",
    updatedAt: now,
    checklist: { total: 5, done: 3 },
    commentsCount: 7,
    tags: ["security"]
  },
  {
    id: "t_marketing",
    workspaceId: "demo",
    location: "board",
    title: "Prepare marketing campaign assets",
    priority: "medium",
    dueDate: "2024-08-10",
    assigneeId: "p_alice",
    createdBy: "p_alice",
    updatedAt: now,
    checklist: { total: 2, done: 2 },
    commentsCount: 9,
    tags: ["marketing"]
  },
  {
    id: "t_onboard",
    workspaceId: "demo",
    location: "board",
    title: "Onboard new team members",
    priority: "low",
    dueDate: "2024-08-25",
    assigneeId: "p_alice",
    createdBy: "p_alice",
    updatedAt: now,
    checklist: { total: 0, done: 0 },
    commentsCount: 1,
    tags: ["people"]
  },
  {
    id: "t_roadmap",
    workspaceId: "demo",
    location: "board",
    title: "Plan Q3 product roadmap",
    priority: "high",
    dueDate: "2024-08-03",
    assigneeId: "p_alice",
    createdBy: "p_alice",
    updatedAt: now,
    checklist: { total: 0, done: 0 },
    commentsCount: 8,
    tags: ["planning"]
  },
  {
    id: "t_layout",
    workspaceId: "demo",
    location: "board",
    title: "Design new dashboard layout",
    priority: "critical",
    dueDate: "2024-07-30",
    assigneeId: "p_bob",
    createdBy: "p_bob",
    updatedAt: now,
    checklist: { total: 4, done: 0 },
    commentsCount: 12,
    tags: ["design"]
  },
  {
    id: "t_review_pr",
    workspaceId: "demo",
    location: "board",
    title: "Review PR for frontend components",
    priority: "critical",
    dueDate: "2024-07-28",
    assigneeId: "p_bob",
    createdBy: "p_bob",
    updatedAt: now,
    checklist: { total: 1, done: 0 },
    commentsCount: 2,
    tags: ["engineering"]
  },
  {
    id: "t_research",
    workspaceId: "demo",
    location: "board",
    title: "Research new UI/UX trends",
    priority: "low",
    dueDate: "2024-09-15",
    assigneeId: "p_bob",
    createdBy: "p_bob",
    updatedAt: now,
    checklist: { total: 0, done: 0 },
    commentsCount: 0,
    tags: ["research"]
  },
  {
    id: "t_api",
    workspaceId: "demo",
    location: "board",
    title: "Develop API for task creation",
    priority: "high",
    dueDate: "2024-08-01",
    assigneeId: "p_charlie",
    createdBy: "p_charlie",
    updatedAt: now,
    checklist: { total: 6, done: 2 },
    commentsCount: 5,
    tags: ["backend"]
  },
  {
    id: "t_refactor",
    workspaceId: "demo",
    location: "board",
    title: "Refactor old codebase for scalability",
    priority: "medium",
    dueDate: "2024-09-01",
    assigneeId: "p_charlie",
    createdBy: "p_charlie",
    updatedAt: now,
    checklist: { total: 10, done: 8 },
    commentsCount: 4,
    tags: ["engineering"]
  },
  {
    id: "t_cicd",
    workspaceId: "demo",
    location: "board",
    title: "Setup CI/CD pipeline",
    priority: "medium",
    dueDate: "2024-08-05",
    assigneeId: "p_charlie",
    createdBy: "p_charlie",
    updatedAt: now,
    checklist: { total: 3, done: 1 },
    commentsCount: 4,
    tags: ["devops"]
  },
  {
    id: "t_bug",
    workspaceId: "demo",
    location: "board",
    title: "Fix critical bug in payment flow",
    priority: "critical",
    dueDate: "2024-07-29",
    assigneeId: "p_charlie",
    createdBy: "p_charlie",
    updatedAt: now,
    checklist: { total: 1, done: 1 },
    commentsCount: 10,
    tags: ["bug"]
  }
];

// Seed placements derived from the legacy task fields so existing UI still works while
// we migrate Board rendering to placements.
function seedPlacementsFromTasks(): TaskPlacement[] {
  const placements: TaskPlacement[] = [];
  let i = 0;
  for (const t of demoTasks) {
    i += 1;
    if (t.location === "inbox") {
      placements.push({
        id: `pl_${t.id}_inbox`,
        workspaceId: t.workspaceId,
        taskId: t.id,
        listId: "l_inbox",
        position: i * 100,
        createdBy: t.createdBy,
        createdAt: now
      });
      continue;
    }

    // Board tasks: place into the assignee's person list (MVP behavior).
    const listId =
      t.assigneeId === "p_alice"
        ? "l_person_alice"
        : t.assigneeId === "p_bob"
          ? "l_person_bob"
          : t.assigneeId === "p_charlie"
            ? "l_person_charlie"
            : "l_person_alice";
    placements.push({
      id: `pl_${t.id}_${listId}`,
      workspaceId: t.workspaceId,
      taskId: t.id,
      listId,
      position: i * 100,
      createdBy: t.createdBy,
      createdAt: now
    });

    // Demonstrate multi-placement in MVP: put one task into a project list too.
    if (t.id === "t_roadmap") {
      placements.push({
        id: `pl_${t.id}_project`,
        workspaceId: t.workspaceId,
        taskId: t.id,
        listId: "l_project_demo",
        position: (i + 1) * 100,
        createdBy: t.createdBy,
        createdAt: now
      });
    }
  }
  return placements;
}

demoTaskPlacements.push(...seedPlacementsFromTasks());


