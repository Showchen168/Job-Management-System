import { describe, it, expect } from 'vitest';
import {
    buildCommentPayload,
    buildCommentSummary,
    buildCommentThreadSummary,
    mergeCommentMetadata,
} from '../comments';

describe('buildCommentPayload', () => {
    it('creates a clean comment payload for task comments', () => {
        const payload = buildCommentPayload({
            content: '  請補已讀邏輯  ',
            entityType: 'task',
            user: { email: 'doris@test.com' },
        });

        expect(payload).toMatchObject({
            content: '請補已讀邏輯',
            entityType: 'task',
            createdByEmail: 'doris@test.com',
            createdByName: 'doris',
        });
    });
});

describe('buildCommentSummary', () => {
    it('builds summary fields from latest comment', () => {
        const summary = buildCommentSummary({
            existingCount: 2,
            comment: {
                content: '這筆通知要能直接跳卡片',
                createdByEmail: 'show@test.com',
            },
        });

        expect(summary.commentCount).toBe(3);
        expect(summary.lastCommentBy).toBe('show');
        expect(summary.lastCommentPreview).toBe('這筆通知要能直接跳卡片');
    });

    it('truncates long preview content', () => {
        const summary = buildCommentSummary({
            existingCount: 0,
            comment: {
                content: '1234567890123456789012345678901234567890',
                createdByEmail: 'show@test.com',
            },
        });

        expect(summary.lastCommentPreview.length).toBeLessThanOrEqual(33);
        expect(summary.lastCommentPreview.endsWith('...')).toBe(true);
    });
});

describe('mergeCommentMetadata', () => {
    it('keeps existing card fields and injects comment summary', () => {
        const merged = mergeCommentMetadata(
            { title: '通知功能', status: 'On-going' },
            { commentCount: 4, lastCommentBy: 'show', lastCommentPreview: '請補測試' }
        );

        expect(merged).toMatchObject({
            title: '通知功能',
            status: 'On-going',
            commentCount: 4,
            lastCommentBy: 'show',
            lastCommentPreview: '請補測試',
        });
    });
});

describe('buildCommentThreadSummary', () => {
    it('rebuilds card summary from the latest comment in the thread', () => {
        const summary = buildCommentThreadSummary([
            {
                id: 'comment-1',
                content: '先確認桌機版',
                createdByEmail: 'doris@test.com',
                createdAt: '2026-04-18T09:00:00.000Z',
            },
            {
                id: 'comment-2',
                content: '手機版我也一起修',
                createdByEmail: 'show@test.com',
                createdAt: '2026-04-18T10:00:00.000Z',
            },
        ]);

        expect(summary).toMatchObject({
            commentCount: 2,
            lastCommentBy: 'show',
            lastCommentPreview: '手機版我也一起修',
            lastCommentAt: '2026-04-18T10:00:00.000Z',
        });
    });

    it('clears summary when all comments are deleted', () => {
        const summary = buildCommentThreadSummary([]);

        expect(summary).toMatchObject({
            commentCount: 0,
            lastCommentBy: '',
            lastCommentPreview: '',
            lastCommentAt: null,
        });
    });
});
