import { describe, it, expect, beforeEach } from "vitest";
import {
    listGlobalTasks,
    createTask,
    createWorkspace,
    __dangerousResetMockDb,
    listTasks
} from "./api";

describe("Global Tasks API (Mock Adapter)", () => {
    beforeEach(() => {
        __dangerousResetMockDb();
    });

    it("should fetch active tasks from all workspaces for the current user", async () => {
        // 1. Create two workspaces
        const ws1 = await createWorkspace({ name: "Workspace 1" });
        const ws2 = await createWorkspace({ name: "Workspace 2" });

        // 2. Create tasks in both workspaces
        await createTask({
            workspaceId: ws1.id,
            createdBy: "p_alice",
            title: "Task in WS 1 - Inbox",
            priority: "medium",
            location: "inbox"
        });

        await createTask({
            workspaceId: ws2.id,
            createdBy: "p_alice",
            title: "Task in WS 2 - Board",
            priority: "high",
            location: "board"
        });

        // 3. Verify local queries are isolated
        const ws1Tasks = await listTasks(ws1.id);
        expect(ws1Tasks.length).toBeGreaterThanOrEqual(1);
        expect(ws1Tasks.some((t) => t.title === "Task in WS 1 - Inbox")).toBe(true);
        expect(ws1Tasks.some((t) => t.title === "Task in WS 2 - Board")).toBe(false);

        // 4. Verify global query returns tasks from both workspaces
        const globalTasks = await listGlobalTasks();
        expect(globalTasks.some((t) => t.title === "Task in WS 1 - Inbox")).toBe(true);
        expect(globalTasks.some((t) => t.title === "Task in WS 2 - Board")).toBe(true);
    });
});
