# NXTUP State Simulation Engine - Blueprint & Spec

## Overview
A "Headless State Simulator" and "Data Seeding Engine" designed to populate the NXTUP application with structured, highly realistic test data. This enables robust UI/UX testing, performance stress testing, and provides an active environment for testing the AI agent's logic without manually dragging/dropping tasks or creating mock data by hand.

## Core Requirements

### 1. Blueprint Configuration (State Definition)
The initial test state should be definable via a plain-English `simulation_profile.yml` or JSON file.
**Configurable Parameters:**
- `team_members`: [List of names/IDs, e.g., Dave, Alice, Bob]
- `projects`: [List of active projects/groups, e.g., Launch, Q3 Planning]
- `initial_task_count`: Base number of tasks to generate (e.g., 100 or 150)
- `inbox_volume`: Number of unassigned/untriaged tasks sitting in the Inbox
- `meeting_frequency`: Rate at which events (like meetings) occur

### 2. The Database Seeder (Static Initialization)
A CLI command (e.g., `npm run sim:seed`) to reset and initialize the workspace. 
**Behavior:**
- Instantly wipes the current target workspace data.
- Parses the active Blueprint configuration file.
- Populates the Supabase database with realistic mock data, randomly assigning tasks to the defined team members and clustering them accurately within the defined projects and lists.

### 3. The Time-Clock Simulator (Dynamic Runtime)
A persistent runtime script (e.g., `npm run sim:start`) that mocks the passage of time over a simulated workday.
**Time Scale:**
- `1 real-time second = 1 workspace minute` (e.g., 15 real seconds = 15-minute simulated meeting).

**Probabilistic Event Handlers:**
- **Meetings Ending:** The script calculates when a scheduled meeting concludes. Upon ending, it alters connected tasks based on a probability matrix (e.g., 70% of associated tasks are marked as `done`, 30% drag on and have their due date pushed or are re-assigned).
- **Inbound Communications/Emails:** Every few simulated minutes, a new unassigned task enters the Inbox.
- **Task Overdues:** Tasks age and adjust priority dynamically based on the simulated clock.

## Implementation Plan

Because this tool must not pollute the production application bundle, it should be isolated (e.g., `scripts/simulation` or a completely separate Node module executing directly against the Supabase database adapter).

**Phase 1: Static Seeder**
- Build the configuration parser to read the YAML/JSON blueprint.
- Build the Data Seeder script to wipe and generate mock data based on the blueprint rules. 

**Phase 2: Tick Engine**
- Build the NodeJS interval loop that governs the "Clock" representing the passage of simulated time.

**Phase 3: Active Simulation Events**
- Implement handlers for "Meeting Ended" state transitions (completed vs delayed tasks).
- Implement background "Inbound" task generation feeding into the Inbox.


*Note: This specification was brainstormed during UI implementation and safely tucked away for the next sprint/feature phase.*
