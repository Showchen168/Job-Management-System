// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CommentsPanel from '../CommentsPanel';

describe('CommentsPanel', () => {
    it('renders comments and sends trimmed content', () => {
        const onSubmit = vi.fn();

        render(
            <CommentsPanel
                comments={[
                    { id: '1', createdByName: 'show', content: '請補通知邏輯' },
                ]}
                onSubmit={onSubmit}
            />
        );

        expect(screen.getByText('請補通知邏輯')).toBeInTheDocument();
        fireEvent.change(screen.getByPlaceholderText('輸入留言...'), { target: { value: '  我來處理  ' } });
        fireEvent.click(screen.getByRole('button', { name: '送出留言' }));
        expect(onSubmit).toHaveBeenCalledWith('我來處理');
    });

    it('only shows edit and delete actions for the comment owner', () => {
        render(
            <CommentsPanel
                currentUserEmail="show@test.com"
                comments={[
                    { id: '1', createdByName: 'show', createdByEmail: 'show@test.com', content: '這段我來改' },
                    { id: '2', createdByName: 'doris', createdByEmail: 'doris@test.com', content: '我先補資料' },
                ]}
            />
        );

        expect(screen.getByRole('button', { name: '編輯留言' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '刪除留言' })).toBeInTheDocument();
        expect(screen.getAllByText('這段我來改')).toHaveLength(1);
        expect(screen.queryByRole('button', { name: '編輯留言', hidden: true })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: '編輯留言' })).toHaveLength(1);
        expect(screen.getAllByRole('button', { name: '刪除留言' })).toHaveLength(1);
    });

    it('allows the comment owner to edit with trimmed content', () => {
        const onEdit = vi.fn();

        render(
            <CommentsPanel
                currentUserEmail="show@test.com"
                comments={[
                    { id: '1', createdByName: 'show', createdByEmail: 'show@test.com', content: '原本內容' },
                ]}
                onEdit={onEdit}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: '編輯留言' }));
        fireEvent.change(screen.getByDisplayValue('原本內容'), { target: { value: '  更新後內容  ' } });
        fireEvent.click(screen.getByRole('button', { name: '儲存留言' }));

        expect(onEdit).toHaveBeenCalledWith('1', '更新後內容');
    });

    it('allows the comment owner to delete a comment', () => {
        const onDelete = vi.fn();

        render(
            <CommentsPanel
                currentUserEmail="show@test.com"
                comments={[
                    { id: '1', createdByName: 'show', createdByEmail: 'show@test.com', content: '原本內容' },
                ]}
                onDelete={onDelete}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: '刪除留言' }));

        expect(onDelete).toHaveBeenCalledWith('1');
    });
});
