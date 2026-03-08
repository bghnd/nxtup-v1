---
description: Save all work to GitHub and summarize project state
---
When I ask you to "land the plane", you should execute these steps sequentially to secure our work and compress our context so we can start fresh next time:

1. Use `run_command` to check `git status`.
2. Consolidate everything we accomplished during the session into a concise bulleted list.
3. Overwrite the `STATUS.md` file in the root directory with this new summary. This file acts as our persistent memory anchor for future sessions, ensuring we don't have to re-read hundreds of messages to remember where we left off.
4. Review `PRD.md` in the project root. Add or update any product decisions, open questions, or settled concepts from this session. Keep it concise — bullet points and tables preferred. Append to existing sections rather than rewriting. Update the "Last updated" line at the bottom.
// turbo-all
5. Run `git add .` to stage all current changes.
6. Create a descriptive commit message based on the session summary and run `git commit -m "..."`.
7. Run `git push` to upload our work to GitHub.
8. Announce that the plane has landed, summarize what was committed, and confirm that the context is ready to be cleared or the session ended.
