// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NavButton from '../NavButton';

describe('NavButton', () => {
    it('hides the text label when sidebar is collapsed', () => {
        render(
            <NavButton
                active={false}
                onClick={vi.fn()}
                icon={<span data-testid="icon">I</span>}
                label="待辦事項"
                collapsed
            />
        );

        const button = screen.getByRole('button', { name: '待辦事項' });

        expect(button).toHaveAttribute('title', '待辦事項');
        expect(screen.queryByText('待辦事項')).not.toBeInTheDocument();
    });
});
