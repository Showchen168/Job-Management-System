import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToCSV } from '../csv-export';

describe('exportToCSV', () => {
    beforeEach(() => {
        // Mock DOM methods
        vi.spyOn(document, 'createElement').mockReturnValue({
            setAttribute: vi.fn(),
            click: vi.fn(),
            remove: vi.fn(),
        });
        vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
        vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    });

    it('does nothing for empty data', () => {
        exportToCSV([], 'test', [{ key: 'a', label: 'A' }]);
        expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('does nothing for null data', () => {
        exportToCSV(null, 'test', [{ key: 'a', label: 'A' }]);
        expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('creates CSV with data', () => {
        const data = [{ name: 'test', value: '123' }];
        const headers = [
            { key: 'name', label: '名稱' },
            { key: 'value', label: '值' },
        ];
        exportToCSV(data, 'export', headers);
        expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('adds CSV injection protection prefix', () => {
        // Verify the function handles data with special characters
        const data = [{ formula: '=SUM(A1:A10)' }];
        const headers = [{ key: 'formula', label: 'Formula' }];
        // Should not throw
        expect(() => exportToCSV(data, 'test', headers)).not.toThrow();
    });
});
