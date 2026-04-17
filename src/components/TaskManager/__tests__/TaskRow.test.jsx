// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TaskRow from '../TaskRow';

vi.mock('../../Comments/CommentsThread', () => ({
    default: () => <div>comments-thread</div>,
}));

vi.mock('../../Comments/CommentsDialog', () => ({
    default: () => null,
}));

describe('TaskRow', () => {
    it('shows explicit row action buttons', () => {
        render(
            <table>
                <tbody>
                    <TaskRow
                        task={{
                            id: 'task-1',
                            path: 'mock/tasks/task-1',
                            title: '補通知鈴鐺',
                            status: 'On-going',
                            source: 'Meeting',
                            assignee: 'doris',
                            assignedDate: '2026-04-17',
                            dueDate: '2026-04-18',
                            commentCount: 1,
                        }}
                        unreadCommentCount={2}
                        onEdit={() => {}}
                        onDelete={() => {}}
                    />
                </tbody>
            </table>
        );

        expect(screen.getByRole('button', { name: '開啟留言視窗' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '編輯任務' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '刪除任務' })).toBeInTheDocument();
        expect(screen.getByLabelText('新留言 2')).toBeInTheDocument();
        expect(screen.queryByText('查看詳情')).not.toBeInTheDocument();
        expect(screen.queryByText(/^1$/)).not.toBeInTheDocument();
    });
});
