import { describe, it, expect } from 'vitest';
import { extractProgressByDateRange, cleanAIResponse, isOnGoingStatus, formatLocalDate } from '../helpers';

describe('extractProgressByDateRange', () => {
    it('returns original text if no date range specified', () => {
        const text = '1/5 完成需求分析\n1/10 開始開發';
        expect(extractProgressByDateRange(text, null, null)).toBe(text);
    });

    it('returns original text if progressText is empty', () => {
        expect(extractProgressByDateRange('', '2025-01-01', '2025-01-31')).toBe('');
    });

    it('returns null if progressText is null', () => {
        expect(extractProgressByDateRange(null, '2025-01-01', '2025-01-31')).toBeNull();
    });

    it('filters lines by date range with year prefix', () => {
        const text = '2025/1/5 完成需求分析\n2025/1/15 開始開發\n2025/2/1 完成測試';
        const result = extractProgressByDateRange(text, '2025-01-10', '2025-01-31');
        expect(result).toContain('2025/1/15 開始開發');
        expect(result).not.toContain('2025/2/1');
    });

    it('keeps lines within date range', () => {
        const text = '2025/1/5 任務一\n2025/1/6 任務二\n2025/2/1 任務三';
        const result = extractProgressByDateRange(text, '2025-01-01', '2025-01-10');
        expect(result).toContain('2025/1/5');
        expect(result).toContain('2025/1/6');
    });

    it('preserves lines without dates', () => {
        const text = '進度備註\n1/5 完成任務\n一般說明';
        const result = extractProgressByDateRange(text, '2025-01-01', '2025-01-10');
        expect(result).toContain('進度備註');
        expect(result).toContain('一般說明');
    });
});

describe('cleanAIResponse', () => {
    it('returns empty string for null', () => {
        expect(cleanAIResponse(null)).toBe('');
    });

    it('removes markdown bold markers', () => {
        expect(cleanAIResponse('**bold text**')).toBe('bold text');
    });

    it('removes markdown italic markers', () => {
        expect(cleanAIResponse('*italic*')).toBe('italic');
    });

    it('removes heading markers', () => {
        expect(cleanAIResponse('## Heading')).toBe('Heading');
    });

    it('removes inline code backticks', () => {
        expect(cleanAIResponse('use `code` here')).toBe('use code here');
    });

    it('removes image markdown', () => {
        expect(cleanAIResponse('![alt](url)')).toBe('');
    });

    it('preserves link text', () => {
        expect(cleanAIResponse('[click here](url)')).toBe('click here');
    });
});

describe('isOnGoingStatus', () => {
    it('returns false for null', () => {
        expect(isOnGoingStatus(null)).toBe(false);
    });

    it('detects "on-going"', () => {
        expect(isOnGoingStatus('On-going')).toBe(true);
    });

    it('detects "ongoing"', () => {
        expect(isOnGoingStatus('Ongoing')).toBe(true);
    });

    it('detects Chinese "進行"', () => {
        expect(isOnGoingStatus('進行中')).toBe(true);
    });

    it('returns false for "Done"', () => {
        expect(isOnGoingStatus('Done')).toBe(false);
    });

    it('returns false for "Pending"', () => {
        expect(isOnGoingStatus('Pending')).toBe(false);
    });
});

describe('formatLocalDate', () => {
    it('formats date as YYYY-MM-DD', () => {
        const date = new Date(2025, 0, 15); // Jan 15, 2025
        expect(formatLocalDate(date)).toBe('2025-01-15');
    });

    it('handles string input', () => {
        const result = formatLocalDate('2025-06-01');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns today date by default', () => {
        const result = formatLocalDate();
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});
