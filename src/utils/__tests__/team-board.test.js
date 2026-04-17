import { describe, it, expect } from 'vitest';
import {
    buildBoardItems,
    buildTeamBoardColumns,
    filterBoardItems,
} from '../team-board';

describe('buildBoardItems', () => {
    it('normalizes task and issue records into board items', () => {
        const result = buildBoardItems({
            tasks: [{ id: 'task-1', title: '補通知', assignee: 'doris', status: 'On-going', teamId: 'team-1' }],
            issues: [{ id: 'issue-1', title: '留言區過高', assignee: 'show', status: '處理中', teamId: 'team-1' }],
        });

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({ type: 'task', id: 'task-1' });
        expect(result[1]).toMatchObject({ type: 'issue', id: 'issue-1' });
    });
});

describe('filterBoardItems', () => {
    const items = [
        { id: 'task-1', type: 'task', status: 'On-going', teamId: 'team-1' },
        { id: 'issue-1', type: 'issue', status: '處理中', teamId: 'team-1' },
        { id: 'task-2', type: 'task', status: 'Done', teamId: 'team-2' },
    ];

    it('filters by team and type', () => {
        const result = filterBoardItems(items, {
            teamId: 'team-1',
            type: 'task',
            status: 'All',
        });

        expect(result).toEqual([{ id: 'task-1', type: 'task', status: 'On-going', teamId: 'team-1' }]);
    });
});

describe('buildTeamBoardColumns', () => {
    it('creates one column per leader/member and attaches matching cards', () => {
        const columns = buildTeamBoardColumns({
            team: {
                leaderIds: ['leader@test.com'],
                members: ['doris@test.com', 'show@test.com'],
            },
            items: [
                { id: 'task-1', assigneeEmail: 'doris@test.com', title: '補通知' },
                { id: 'issue-1', assigneeEmail: 'show@test.com', title: '處理留言' },
            ],
        });

        expect(columns).toHaveLength(3);
        expect(columns[1].memberName).toBe('doris');
        expect(columns[1].items).toHaveLength(1);
        expect(columns[2].memberName).toBe('show');
        expect(columns[2].items[0].title).toBe('處理留言');
    });
});
