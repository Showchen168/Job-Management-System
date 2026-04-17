// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TaskManager from '../TaskManager';

vi.mock('../TaskForm', () => ({
    default: () => null,
}));

vi.mock('../../common/Modal', () => ({
    default: () => null,
}));

vi.mock('../../AIConversationModal', () => ({
    default: () => null,
}));

vi.mock('../../common/CollapsibleDoneSection', () => ({
    default: ({ children }) => <div>{children}</div>,
}));

describe('TaskManager', () => {
    it('hides redundant admin labels and AI summary button', () => {
        render(
            <TaskManager
                db={null}
                user={{ uid: 'u-1', email: 'show@test.com' }}
                canAccessAll
                isAdmin
                canUseAI
                teams={[]}
                demoMode
                demoState={{ tasks: [], users: [] }}
                testConfig={{ enabled: false }}
            />
        );

        expect(screen.queryByText(/Admin View/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /AI 總結/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /新增/i })).toBeInTheDocument();
        expect(screen.getByTestId('task-toolbar')).toBeInTheDocument();
    });
});
