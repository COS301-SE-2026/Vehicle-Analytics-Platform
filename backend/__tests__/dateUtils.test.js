const {
    REPORT_TIMEZONE,
    toLocalDate,
    addDays,
    datesBetween,
    minDate,
    maxDate,
} = require('../src/utils/dateUtils');

describe('toLocalDate', () => {
    test('uses South African time', () => {
        expect(REPORT_TIMEZONE).toBe('Africa/Johannesburg');
    });

    test('a UTC evening is already the next day in SAST', () => {
        expect(toLocalDate(new Date('2026-09-23T22:30:00Z'))).toBe('2026-09-24');
    });

    test('a UTC afternoon is the same day', () => {
        expect(toLocalDate(new Date('2026-09-23T12:00:00Z'))).toBe('2026-09-23');
    });

    test('accepts a string', () => {
        expect(toLocalDate('2026-09-23T21:59:59Z')).toBe('2026-09-23');
    });
});

describe('addDays', () => {
    test.each([
        ['2026-09-23', 1, '2026-09-24'],
        ['2026-09-30', 1, '2026-10-01'],
        ['2026-02-28', 1, '2026-03-01'],
        ['2028-02-28', 1, '2028-02-29'],
        ['2026-01-01', -1, '2025-12-31'],
        ['2026-09-23', -28, '2026-08-26'],
        ['2026-09-23', 0, '2026-09-23'],
    ])('%s plus %i days is %s', (date, n, expected) => {
        expect(addDays(date, n)).toBe(expected);
    });
});

describe('datesBetween', () => {
    test('includes both ends', () => {
        expect(datesBetween('2026-09-29', '2026-10-02')).toEqual([
            '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02',
        ]);
    });

    test('a single day', () => {
        expect(datesBetween('2026-09-23', '2026-09-23')).toEqual(['2026-09-23']);
    });

    test('an empty list when the range is backwards', () => {
        expect(datesBetween('2026-09-24', '2026-09-23')).toEqual([]);
    });
});

describe('minDate and maxDate', () => {
    test('compare ISO dates', () => {
        expect(minDate('2026-09-01', '2026-08-31')).toBe('2026-08-31');
        expect(maxDate('2026-09-01', '2026-08-31')).toBe('2026-09-01');
        expect(minDate('2026-09-01', '2026-09-01')).toBe('2026-09-01');
    });
});