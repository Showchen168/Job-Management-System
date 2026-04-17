// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import TeamBoard from '../TeamBoard';

describe('TeamBoard', () => {
    const baseProps = {
        db: null,
        user: { uid: 'u-1', email: 'leader@test.com' },
        teams: [
            {
                id: 'team-rd',
                name: '研發一組',
                leaderIds: ['leader@test.com'],
                members: ['doris@test.com'],
            },
        ],
        canAccessAll: true,
        demoMode: true,
        demoState: {
            users: [
                { uid: 'u-1', email: 'leader@test.com' },
                { uid: 'u-2', email: 'doris@test.com' },
            ],
            tasks: [
                {
                    id: 'task-1',
                    path: 'mock/tasks/task-1',
                    teamId: 'team-rd',
                    title: '出差審批系統搭建',
                    assignee: 'doris',
                    assigneeEmail: 'doris@test.com',
                    status: 'Done',
                    assignedDate: '2026-04-10',
                    dueDate: '2026-04-17',
                    progress: '已完成驗收',
                    updatedAt: '2026-04-18T10:00:00.000Z',
                    commentCount: 0,
                },
            ],
            issues: [
                {
                    id: 'issue-1',
                    path: 'mock/issues/issue-1',
                    teamId: 'team-rd',
                    itemName: '員工工作台',
                    title: '留言區高度太擠',
                    assignee: 'leader',
                    assigneeEmail: 'leader@test.com',
                    status: '處理中',
                    issueSource: '開發',
                    issueLocation: '測試',
                    dueDate: '2026-04-20',
                    progress: '先調整桌機 spacing',
                    updatedAt: '2026-04-19T09:30:00.000Z',
                    commentCount: 0,
                },
            ],
        },
    };

    it('keeps only the filter toolbar in the header area', () => {
        render(<TeamBoard {...baseProps} />);

        expect(screen.queryByText(/切換團隊後/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/目前共/i)).not.toBeInTheDocument();
        expect(screen.getByTestId('team-board-toolbar-shell')).toHaveClass('sticky');
        expect(screen.getByTestId('team-board-toolbar')).toBeInTheDocument();
        expect(screen.getByDisplayValue('研發一組')).toBeInTheDocument();
        expect(screen.getByDisplayValue('全部類型')).toBeInTheDocument();
        expect(screen.getByDisplayValue('全部狀態')).toBeInTheDocument();
    });

    it('opens the item content dialog on the same page when clicking a card', () => {
        render(<TeamBoard {...baseProps} />);

        fireEvent.click(screen.getByRole('button', { name: /留言區高度太擠/i }));

        const dialog = screen.getByRole('dialog', { name: '問題內容視窗' });
        expect(dialog).toBeInTheDocument();
        expect(within(dialog).getByText('最後編輯 2026/4/19')).toBeInTheDocument();
        expect(within(dialog).getByText('進度更新')).toBeInTheDocument();
        expect(within(dialog).getByText('先調整桌機 spacing')).toBeInTheDocument();
    });

    it('moves completed cards into the archive section and keeps last edited time visible', () => {
        render(<TeamBoard {...baseProps} />);

        expect(screen.queryByRole('button', { name: /出差審批系統搭建/i })).not.toBeInTheDocument();
        expect(screen.getByText('最後編輯 2026/4/19')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '已歸檔' }));

        expect(screen.getByRole('button', { name: /出差審批系統搭建/i })).toBeInTheDocument();
        expect(screen.getByText('最後編輯 2026/4/18')).toBeInTheDocument();
    });

    it('shows archived task content in the dialog after expanding the archive section', () => {
        render(<TeamBoard {...baseProps} />);

        fireEvent.click(screen.getByRole('button', { name: '已歸檔' }));
        fireEvent.click(screen.getByRole('button', { name: /出差審批系統搭建/i }));

        const dialog = screen.getByRole('dialog', { name: '任務內容視窗' });
        expect(dialog).toBeInTheDocument();
        expect(within(dialog).getByText('進度摘要')).toBeInTheDocument();
        expect(within(dialog).getByText('已完成驗收')).toBeInTheDocument();
    });
});
