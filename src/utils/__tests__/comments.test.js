import { describe, it, expect } from 'vitest';
import {
    buildCommentPayload,
    buildCommentSummary,
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
