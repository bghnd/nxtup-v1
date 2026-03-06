---
description: Resume context from previous session and start development
---
When I say "ready for takeoff", you should execute these steps sequentially to rapidly spin up our environment and regain context:

1. Use `view_file` to read the `STATUS.md` file in the root directory. This will reload our exact context from where we last "landed the plane".
2. Read the `task.md` artifact (if present) to see what outstanding checklist items remain. 
// turbo-all
3. Run `git status` and `git log -1` to verify we are on the correct branch and review the last commit.
4. Run `npm run dev` in the background to spin up the local development server so we can begin working immediately.
5. Announce that we are ready for takeoff, print a very brief summary of where we left off based on `STATUS.md`, and ask me what we are tackling first today.
