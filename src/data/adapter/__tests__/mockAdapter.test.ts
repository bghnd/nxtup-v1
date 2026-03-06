import { describe, it, expect, beforeEach } from 'vitest';
import { mockAdapter } from '../mockAdapter';
import { __dangerousResetMockDb } from '../../api';

describe('mockAdapter', () => {
    beforeEach(() => {
        __dangerousResetMockDb();
    });

    describe('Workspace Operations', () => {
        it('creates, reads, updates, and deletes a workspace', async () => {
            // Create
            const ws = await mockAdapter.createWorkspace({ name: 'Test WS' });
            expect(ws.id).toBeDefined();
            expect(ws.name).toBe('Test WS');
            expect(ws.createdBy).toBeDefined();

            // Read
            const workspaces = await mockAdapter.listWorkspaces();
            expect(workspaces.some(w => w.id === ws.id)).toBe(true);

            // Update
            const updated = await mockAdapter.updateWorkspace({ id: ws.id, name: 'Updated WS' });
            expect(updated.name).toBe('Updated WS');

            // Delete
            await mockAdapter.deleteWorkspace(ws.id);
            const afterDelete = await mockAdapter.listWorkspaces();
            expect(afterDelete.some(w => w.id === ws.id)).toBe(false);
        });
    });

    describe('Group Operations', () => {
        it('creates, reads, updates, and deletes a task group', async () => {
            const wsId = 'ws_test';

            const group = await mockAdapter.createTaskGroup({ workspaceId: wsId, title: 'Test Group' });
            expect(group.id).toBeDefined();
            expect(group.title).toBe('Test Group');
            expect(group.workspaceId).toBe(wsId);

            const groups = await mockAdapter.listTaskGroups(wsId);
            expect(groups.some(g => g.id === group.id)).toBe(true);

            const updated = await mockAdapter.updateTaskGroup({ id: group.id, title: 'Updated Group', description: 'desc' });
            expect(updated.title).toBe('Updated Group');
            expect(updated.description).toBe('desc');

            await mockAdapter.deleteTaskGroup(group.id);
            const afterDelete = await mockAdapter.listTaskGroups(wsId);
            expect(afterDelete.some(g => g.id === group.id)).toBe(false);
        });
    });

    describe('List Operations', () => {
        it('creates, updates, and deletes a task list', async () => {
            const wsId = 'ws_test';
            const groupId = 'g_test';

            const list = await mockAdapter.createTaskList({
                workspaceId: wsId,
                groupId,
                type: 'inbox',
                title: 'Test List'
            });
            expect(list.title).toBe('Test List');
            expect(list.groupId).toBe(groupId);

            const updated = await mockAdapter.updateTaskList({ id: list.id, title: 'Updated List', groupId: null });
            expect(updated.title).toBe('Updated List');
            expect(updated.groupId).toBeNull();

            await mockAdapter.deleteTaskList(list.id);
            const afterDelete = await mockAdapter.listTaskLists(wsId);
            expect(afterDelete.some(l => l.id === list.id)).toBe(false);
        });
    });

    describe('Task & Placement Operations', () => {
        it('handles the full lifecycle of tasks and placements including duplication', async () => {
            const wsId = 'ws_test';
            const userId = 'u_test';

            // Setup
            const list = await mockAdapter.createTaskList({ workspaceId: wsId, groupId: null, type: 'other', title: 'Test List' });

            // Create Task
            const task = await mockAdapter.createTask({
                workspaceId: wsId,
                createdBy: userId,
                title: 'Core Task',
                priority: 'high',
                location: 'board'
            });
            expect(task.title).toBe('Core Task');

            // Update Task
            const updatedTask = await mockAdapter.updateTask({ id: task.id, title: 'Updated Task', priority: 'low' });
            expect(updatedTask.title).toBe('Updated Task');
            expect(updatedTask.priority).toBe('low');

            // Create Placement
            const placement = await mockAdapter.createTaskPlacement({
                workspaceId: wsId,
                taskId: task.id,
                listId: list.id,
                createdBy: userId
            });
            expect(placement.taskId).toBe(task.id);

            // Update Placement
            const updatedPlacement = await mockAdapter.updateTaskPlacement({ id: placement.id, position: 999 });
            expect(updatedPlacement.position).toBe(999);

            // Duplicate Task
            const duplicate = await mockAdapter.duplicateTask(wsId, task.id, userId);
            expect(duplicate.id).not.toBe(task.id);
            expect(duplicate.title).toBe('Updated Task'); // Matches the updated original

            // Ensure placements duplicated
            const placements = await mockAdapter.listTaskPlacements(wsId);
            const dupPlacement = placements.find(p => p.taskId === duplicate.id);
            expect(dupPlacement).toBeDefined();
            expect(dupPlacement?.listId).toBe(list.id);

            // Delete Placement By Task & List
            await mockAdapter.deleteTaskPlacementByTaskAndList({ workspaceId: wsId, taskId: task.id, listId: list.id });
            const afterDelPlacement = await mockAdapter.listTaskPlacements(wsId);
            expect(afterDelPlacement.some(p => p.id === placement.id)).toBe(false);

            // Delete Task
            await mockAdapter.deleteTask(task.id);
            const tasks = await mockAdapter.listTasks(wsId);
            expect(tasks.some(t => t.id === task.id)).toBe(false);
        });
    });

    describe('Profiles & Members', () => {
        it('creates placeholders, sets roles, and manages participants', async () => {
            const wsId = 'ws_test';
            const taskId = 't_test';

            // Placeholder member
            const profile = await mockAdapter.createMemberPlaceholder({
                workspaceId: wsId,
                name: 'John Doe',
                email: 'john@example.com'
            });
            expect(profile.name).toBe('John Doe');

            // Set member role
            await mockAdapter.setMemberRole({ workspaceId: wsId, profileId: profile.id, role: 'admin' });

            // Upsert Task Participant
            const participant = await mockAdapter.upsertTaskParticipant({
                workspaceId: wsId,
                taskId,
                profileId: profile.id,
                role: 'owner',
                createdBy: 'u_test'
            });
            expect(participant.role).toBe('owner');

            // List Participants
            const participants = await mockAdapter.listTaskParticipants(wsId);
            expect(participants.some(p => p.id === participant.id)).toBe(true);

            // Remove Participant
            await mockAdapter.removeTaskParticipant({ workspaceId: wsId, taskId, profileId: profile.id });
            const afterDel = await mockAdapter.listTaskParticipants(wsId);
            expect(afterDel.some(p => p.id === participant.id)).toBe(false);
        });
    });
});
