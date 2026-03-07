# Project Status

## Recent Accomplishments
- Refactored the data model and API layer to support Global Tasks, decoupling them from rigid workspace silos.
- Created `listGlobalTasks` to fetch tasks unconstrained by local workspace IDs.
- Implemented the `IndexPanel.tsx` in the Context Sidebar to display global tasks with functional sub-menu filters (A-Z, Recent, Unlisted).
- Re-wired the `BoardPage.tsx` to utilize global task fetching, correctly rendering locally placed tasks and gracefully filtering out unlisted foreign tasks.
- Overhauled Drag and Drop (React-DnD): 
  - Converted native HTML5 `InboxTaskCard` and `IndexTaskCard` to `react-dnd` `useDrag` payloads matching the board components.
  - Fixed a critical backend `UUID` parsing bug to allow tasks dragged from synthetic lists (like `"l_inbox"`) to successfully save their new location and placement in the database.
- Unified task typography (`font-light`, `text-foreground-muted`) across all task components (inbox, index, boards).

## Next Steps
- Establish robust automated testing (Vitest) setup and coverage for the global data layer once the macOS `EPERM` `.npm` cache restrictions are resolved.
- Continue tracking and resolving any remaining quirks with global task visibility and interactions.
