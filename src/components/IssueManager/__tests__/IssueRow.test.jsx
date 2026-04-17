// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import IssueRow from '../IssueRow';

vi.mock('../../Comments/CommentsThread', () => ({
    default: () => <div>comments-thread</div>,
}));

vi.mock('../../Comments/CommentsDialog', () => ({
    default: () => null,
}));

describe('IssueRow', () => {
    it('keeps visible actions even when the user cannot edit', () => {
        render(
            <table>
                <tbody>
                    <IssueRow
                        issue={{
                            id: 'issue-1',
                            path: 'mock/issues/issue-1',
                            itemName: '員工工作台',
                            title: '留言區高度太擠',
                            issueSource: '開發',
                            issueLocation: '測試',
                            assignee: 'leader',
                            status: '處理中',
                            dueDate: '2026-04-20',
                            commentCount: 0,
                        }}
                        unreadCommentCount={1}
                        onEdit={() => {}}
                        onDelete={() => {}}
                        canEdit={false}
                    />
                </tbody>
            </table>
        );

        expect(screen.getByRole('button', { name: '開啟留言視窗' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '編輯問題' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '刪除問題' })).not.toBeInTheDocument();
        expect(screen.getByLabelText('新留言 1')).toBeInTheDocument();
        expect(screen.queryByText('查看詳情')).not.toBeInTheDocument();
        expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
        expect(screen.getByText('處理中')).toHaveClass('border-blue-200');
        expect(screen.queryByText('🔵處理中')).not.toBeInTheDocument();
    });
});
