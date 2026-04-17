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
});
