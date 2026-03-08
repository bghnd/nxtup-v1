# NXTUP — Session Status

## Branch
`experiment/ui-and-search`

## Last Session: 2026-03-08 — UI Trim Pass

### What We Did

**Add Task affordance — all list cards:**
- Removed all "Add task" labeled buttons from every list card (ungrouped, grouped, unlisted task cards)
- Replaced with a hover-reveal Notion-style affordance: `+ ────────────────`
- `+` is always subtly visible in `text-muted` (matches group meta text color)
- Horizontal line appears on hover, spans width of card
- Applied universally across: ungrouped list cards, unlisted task card (ungrouped), grouped list cards, unlisted task cards (per group)

**Add List strip:**
- Changed from wide horizontal labeled button → tall narrow vertical strip (w-[44px], `self-stretch`)
- Replaced full dashed border with left-edge-only dashed border (`border-l-2 border-dashed`)
- Sharp/crisp corners (no `rounded-*`)
- `+` centered, faintly visible in `text-muted`
- Expands to full card width on drag-over (existing DnD behavior preserved)
- `+` size matches group separator and task affordances

**Group separators (between groups):**
- Replaced `border-t` on section element with a dedicated interactive button
- Full-width horizontal strip; line always visible, `+` fades in at far left on hover only
- Click opens the "Create Group" modal, passing an `insertAfterSortOrder` midpoint so the new group lands between the correct two groups (not always at the bottom)
- Removed "Add list" button from group headers (redundant with Add List strip)

**Add Group button (bottom of board):**
- Removed "Add Group" label and full rounded border
- Now: same large rectangle footprint, top-edge-only dashed border, hover-reveal `+` at size 13
- Consistent with the group separator visual language

**Sort order fix for group insertion:**
- `CreateTaskGroupInput` type extended with optional `sortOrder`
- Mock adapter (`api.ts`) and Supabase adapter both now honor `sortOrder` when provided
- Groups created from a separator mid-board land at the correct position

**Color consistency:**
- All add-affordance borders: `border-border`
- All add-affordance icons: `text-muted` (matches "2 lists • 8 tasks" meta text and group dividers)

**Other cleanup:**
- Removed "OR DROP TASKS HERE" labels from all empty list cards
- "Unlisted Tasks" card headers: removed `?` avatar, removed description, downgraded to `text-xs font-medium text-muted-foreground` (same as "Ungrouped Lists" section label)
- Header selects (user + role): applied `appearance-none`, `rounded-md`, `px-3` to match ghost button family in the header bar

**WorkflowPrompt (carry-over from previous session):**
- Persistent floating bar at `bottom-6`, left-aligned with main content area
- Dynamically adjusts `left` offset based on sidebar + panel state

---

## Next Up

1. **Horizon view** — stub the page and add nav item
2. **Analytics page** — stub under Settings in nav
3. **Left nav restructure** — add Horizon and Analytics nav items
4. **Board visual polish** — continue refining as needed

## Known Issues
- macOS Full Disk Access for background agent node_modules access (requires user to grant in System Settings)
- Group sort order: midpoint fractional approach works but will accumulate decimals over time — future cleanup pass needed
