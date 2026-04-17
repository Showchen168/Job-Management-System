// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MeetingMinutes from '../MeetingMinutes';

vi.mock('../MeetingForm', () => ({
    default: () => null,
}));

vi.mock('../../common/Modal', () => ({
    default: () => null,
}));

vi.mock('../../AIConversationModal', () => ({
    default: () => null,
}));

describe('MeetingMinutes', () => {
    it('hides redundant admin labels and AI summary button', () => {
        render(
            <MeetingMinutes
                db={null}
                user={{ uid: 'u-1', email: 'show@test.com' }}
                canAccessAll
                isAdmin
                canUseAI
                teams={[]}
            />
        );

        expect(screen.queryByText(/Admin View/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /AI 總結/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /新增/i })).toBeInTheDocument();
        expect(screen.getByTestId('meeting-toolbar')).toBeInTheDocument();
    });
});
