import { describe, it, expect } from 'vitest';
import { buildNotificationPayloads } from '../notifications';

describe('buildNotificationPayloads', () => {
    const userEmails = ['alice@aivres.com', 'bob@aivres.com'];

    it('returns empty array when no tasks', () => {
        expect(buildNotificationPayloads([], userEmails)).toEqual([]);
    });

    it('returns empty array when no on-going tasks', () => {
        const tasks = [
            { title: 'Task 1', status: 'Done', assignee: 'alice' },
            { title: 'Task 2', status: 'Pending', assignee: 'bob' },
        ];
        expect(buildNotificationPayloads(tasks, userEmails)).toEqual([]);
    });

    it('builds payloads for on-going tasks', () => {
        const tasks = [
            { title: 'Task 1', status: 'On-going', assignee: 'alice', dueDate: '2025-01-20' },
        ];
        const result = buildNotificationPayloads(tasks, userEmails);
        expect(result).toHaveLength(1);
        expect(result[0].to).toBe('alice@aivres.com');
        expect(result[0].subject).toContain('待辦更新提醒');
        expect(result[0].body).toContain('Task 1');
    });

    it('groups multiple tasks per assignee', () => {
        const tasks = [
            { title: 'Task 1', status: 'On-going', assignee: 'alice', dueDate: '2025-01-20' },
            { title: 'Task 2', status: 'On-going', assignee: 'alice', dueDate: '2025-01-25' },
        ];
        const result = buildNotificationPayloads(tasks, userEmails);
        expect(result).toHaveLength(1);
        expect(result[0].body).toContain('Task 1');
        expect(result[0].body).toContain('Task 2');
    });

    it('skips tasks with unregistered assignees', () => {
        const tasks = [
            { title: 'Task 1', status: 'On-going', assignee: 'unknown', dueDate: '2025-01-20' },
        ];
        const result = buildNotificationPayloads(tasks, userEmails);
        expect(result).toEqual([]);
    });

    it('detects Chinese on-going status', () => {
        const tasks = [
            { title: 'Task 1', status: '進行中', assignee: 'alice', dueDate: '2025-01-20' },
        ];
        const result = buildNotificationPayloads(tasks, userEmails);
        expect(result).toHaveLength(1);
    });
});
