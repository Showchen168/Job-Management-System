// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';

describe('Dashboard', () => {
    it('does not show redundant admin scope labels', () => {
        render(
            <Dashboard
                db={null}
                user={{ uid: 'u-1', email: 'show@test.com' }}
                canAccessAll
                isAdmin
            />
        );

        expect(screen.getByText('總待辦事項')).toBeInTheDocument();
        expect(screen.queryByText(/Admin View/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/All Data/i)).not.toBeInTheDocument();
    });
});
