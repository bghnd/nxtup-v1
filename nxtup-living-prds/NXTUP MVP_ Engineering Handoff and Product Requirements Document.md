# Product Requirements Document (PRD): NXTUP MVP

**Target:** Engineering Handoff for AI-First IDE (e.g., Cursor, Windsurf)

## **1\. Product Overview & Philosophy**

**NXTUP** is the "terminal for executives and team leaders" 1, 2\. It is a keyboard-first, context-anchored application designed to help leaders orchestrate teamwork like code 1, 3\. Instead of dropping tasks into an overwhelming, catch-all to-do list, users capture tasks, notes, and agenda items and instantly "anchor" them to specific contexts—teammates, projects, upcoming meetings, or recurring timeslots 4-6.  
The application operates as a unified experience across two surfaces:

1. **Chrome Extension:** Features an always-available "mega menu" for frictionless, lightning-fast capture and tagging from anywhere on the web 7-10.  
2. **Web App:** The primary dashboard for deep organization, drag-and-drop (DnD) card management, review, and team orchestration 7, 9, 10\.

## **2\. Technical Stack Declaration**

This stack is optimized for speed, real-time sync, and rapid UI iteration 11, 12:

* **Front-End:** React 18+ (SPA), TypeScript, Vite (or Next.js if preferred for routing) 3, 12, 13\.  
* **Styling & UI:** Tailwind CSS and **shadcn/ui** (for components like Cards, Badges, Popovers, Sheets, Command, and Toasts) 3, 14-16.  
* **State & Animation:** Zustand (client state), react-dnd (complex drag-and-drop), Framer Motion (smooth transitions) 3, 13, 15, 17\.  
* **Back-End & Database:** Supabase (Postgres) for data persistence. **Supabase Realtime** must be enabled to sync tasks/anchors live across the extension and web app 3, 13, 18, 19\. Supabase Auth is foundational, though MVP will focus on single-user or simple trust-based sharing 19-21.  
* **Extension:** Chrome Extension using Manifest V3, sharing maximum UI components with the web app 3, 15\.

## **3\. Data Model Architecture**

* **Single Instance, Multiple Anchors:** Every task, note, or agenda item is a single record in the database. It is mapped via an N:M relationship to one or more "anchors" (e.g., a person, a meeting, a project) 18, 19, 22, 23\.  
* **Anchor Deletion Logic:** If an anchor is deleted, the task remains visible on any other anchors it is attached to. If it was *only* attached to the deleted anchor, it reverts to the "Inbox/Backlog" to prevent data loss 24\.  
* **Source Tracking:** Tasks must store metadata indicating their origin (e.g., "Entered from Extension", copied from Asana/Notion). Imported tasks should feature a clickable link back to their external source 25-27.

## **4\. Core User Flows & Functional Requirements (Phase 1\)**

### **A. Quick Entry & Slash Commands**

The Quick Entry field is the "command line" of NXTUP, accessible via the Chrome extension or web app 28-30.

* **Inline /tag Triggers:** Typing / brings up an autocomplete popover for anchors. Confirming a tag transforms it into a visual chip/badge in the input field 31, 32\.  
* **On-the-Fly Creation:** If a /tagname does not exist, the app prompts, "Would you like to add a tag for 'tagname' to your lineup?" Confirming creates the anchor instantly without breaking the user's flow 33, 34\.  
* **The /last Command:** Typing /last recalls the most recently saved entry (text and tags). Edits made here will **overwrite** the original item upon saving 20, 35, 36\. *(Note: /last+ for walking back multiple steps is Phase 2+ 37, 38\)*  
* **The /duplicate Command:** Recalls the last entry but saves it as a brand **new** copy upon submission 20, 39\.  
* **Toasts:** Every save, edit, or anchor creation triggers a 2-4 second non-blocking Toast notification (e.g., "Task created and anchored to Maggie") 40-42.

### **B. Workspace & Drag-and-Drop (DnD)**

* **Main Dashboard:** Displays anchor contexts (Teammates, Meetings, Projects) as expanded cards 43-45.  
* **Inbox/Backlog:** A collapsible panel on the far left houses all unanchored tasks 46\.  
* **DnD Interactions:** Users can drag items from the Inbox to any card, or between cards 20, 47\.  
* *Visuals:* The dragged item visually "lifts" (shadow, scaling). A thick highlight bar indicates the drop slot between items. Target cards highlight their background subtly when hovered over 48\.

### **C. Universal List Item Behavior**

This applies to all tasks, notes, and Done items across the app 49:

* **On Hover:** Displays full content and metadata (chips, owner, dates) in a floating tooltip/modal or an optional right sidebar 49, 50\.  
* **On Click (Inline Edit):** Clicking an item expands it in place (multi-line) and changes the background to a muted highlight color. Users can directly edit text, tags, and anchors without opening a separate "edit mode" 49, 51\. Only one item expands at a time 49\.

### **D. "Done" & Archive Logic**

* **Completion:** Marking a task "Done" triggers a satisfying animation moving the item into the card's "Done" section 52\.  
* **Collapsed by Default:** The Done section is an accordion/collapsible list at the bottom of each card, showing only a completion count badge by default 53, 54\.  
* **Expanded View:** When expanded, completed items show as single lines with an ellipsis (...) for overflow. They support the standard Hover/Click-to-edit interactions mentioned above, allowing users to quickly "Undo" 54-56.

### **E. Global Search (Cmd/Ctrl \+ K)**

* A universal command bar available in both extension and web app 57, 58\.  
* Results populate in real-time, grouped by context (Cards, Tasks, Done, Inbox) 58, 59\.  
* Users can drag-and-drop items directly from the search results onto visible cards 58, 59\.

## **5\. Explicitly Out of Scope (Phase 2+ Boundaries)**

To ensure MVP velocity, the following features must **NOT** be built in Phase 1 20, 43, 60, 61:

* Collapsed cards, tight grid stacking, and DnD onto collapsed cards 60\.  
* Batch/bulk operations (multi-select dragging or completing) 60\.  
* Offline mode and background sync 18, 62\.  
* Advanced /last+ history walkback 38\.  
* Complex team permissions, org roles, or multi-user Auth rules (default to a trust-first/solo baseline for MVP) 20, 63\.  
* Broken source link reconnect UI (MVP just flags as "source unavailable") 64, 65\.  
* Mobile app or mobile responsiveness 66, 67\.

Would you like me to generate a set of specific Jira/Linear tickets breaking down these core flows into atomic engineering tasks for your AI IDE?  
