'use strict';

const {
    resolvePeriod,
    MAX_CUSTOM_PERIOD_DAYS,
} = require('../services/periods');

function utc(iso) {
    return new Date(iso).toISOString();
}

describe('resolvePeriod - custom ranges', () => {
    it('accepts from/to without an anchor', () => {
        expect(() => resolvePeriod({
            periodType: 'custom',
            from: new Date('2026-08-17'),
            to: new Date('2026-08-23'),
        })).not.toThrow();
    });

    it('treats the end date as inclusive', () => {
        const period = resolvePeriod({
            periodType: 'custom',
            from: new Date('2026-08-17'),
            to: new Date('2026-08-23'),
        });

        expect(period.fromDate).toBe('2026-08-17');
        expect(period.toDate).toBe('2026-08-23');
        expect(period.days).toBe(7);
    });

    it('converts the inclusive range to a half-open UTC window', () => {
        const period = resolvePeriod({
            periodType: 'custom',
            from: new Date('2026-08-17'),
            to: new Date('2026-08-23'),
        });

        expect(utc(period.from)).toBe('2026-08-16T22:00:00.000Z');
        expect(utc(period.to)).toBe('2026-08-23T22:00:00.000Z');
    });

    it('allows a single-day range', () => {
        const period = resolvePeriod({
            periodType: 'custom',
            from: new Date('2026-08-17'),
            to: new Date('2026-08-17'),
        });

        expect(period.days).toBe(1);
        expect(period.fromDate).toBe('2026-08-17');
        expect(period.toDate).toBe('2026-08-17');
    });

    it('uses the immediately preceding window of equal length as the baseline', () => {
        const period = resolvePeriod({
            periodType: 'custom',
            from: new Date('2026-08-17'),
            to: new Date('2026-08-23'),
        });

        expect(period.previous).not.toBeNull();
        expect(period.previous.days).toBe(period.days);
        expect(period.previous.fromDate).toBe('2026-08-10');
        expect(period.previous.toDate).toBe('2026-08-16');
        expect(period.previous.to.getTime()).toBe(period.from.getTime());
    });

    it('keeps the baseline equal in length for an odd range', () => {
        const period = resolvePeriod({
            periodType: 'custom',
            from: new Date('2026-08-05'),
            to: new Date('2026-08-14'),
        });

        expect(period.days).toBe(10);
        expect(period.previous.days).toBe(10);
        expect(period.previous.fromDate).toBe('2026-07-26');
        expect(period.previous.toDate).toBe('2026-08-04');
    });
});