// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import IssueManager from '../IssueManager';

vi.mock('../IssueForm', () => ({
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

describe('IssueManager', () => {
    it('hides redundant admin labels and AI summary button', () => {
        render(
            <IssueManager
                db={null}
                user={{ uid: 'u-1', email: 'show@test.com' }}
                canAccessAll
                isAdmin
                canUseAI
                teams={[]}
                demoMode
                demoState={{ issues: [], users: [] }}
            />
        );

        expect(screen.queryByText(/Admin View/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /AI 總結/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /新增問題/i })).toBeInTheDocument();
        expect(screen.getByTestId('issue-toolbar')).toBeInTheDocument();
        expect(screen.queryByText('全部問題')).not.toBeInTheDocument();
        expect(screen.queryByText('未解決')).not.toBeInTheDocument();
        expect(screen.queryByText('已逾期')).not.toBeInTheDocument();
        expect(screen.queryByText('已解決/關閉')).not.toBeInTheDocument();
    });
});
