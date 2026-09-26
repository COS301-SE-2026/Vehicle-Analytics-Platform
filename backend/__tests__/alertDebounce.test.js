const {applyDebounce} = require('../src/utils/alertDebounce')

describe('applyDebounce', () => {
    test('keeps a single breach', () => {
        const result = applyDebounce([{ vehicle_id: '1', time: '2026-09-01T08:00:00Z'}])
        expect(result).toHaveLength(1)
    })

    test('collapse breaches inside the window', () => {
        const result = applyDebounce([
            {vehicle_id: '1', time: '2026-09-01T08:00:00Z'},
            {vehicle_id: '1', time: '2026-09-01T08:01:00Z'},
            {vehicle_id: '1', time: '2026-09-01T08:03:00Z'},
        ])

        expect(result).toHaveLength(1)
    })

    test('keeps a breach exactly on the window boundary', () => {
        const result = applyDebounce([
            {vehicle_id: '1', time: '2026-09-01T08:00:00Z'},
            {vehicle_id: '1', time: '2026-09-01T08:05:00Z'},
        ])

        expect(result).toHaveLength(2)
    })

    test('debounces each vehicle independently', () => {
        const result = applyDebounce([
            {vehicle_id: '1', time: '2026-09-01T08:00:00Z'},
            {vehicle_id: '2', time: '2026-09-01T08:01:00Z'},
        ])

        expect(result).toHaveLength(2)
    })

    test('handles unsorted input', () => {
        const result = applyDebounce([
            {vehicle_id: '1', time: '2026-09-01T08:10:00Z'},
            {vehicle_id: '1', time: '2026-09-01T08:00:00Z'},
        ])

        expect(result).toHaveLength(2)
        expect(result[0].time).toBe('2026-09-01T08:00:00Z')
    })

    test('returnd an empty array for no breaches', () => {
        expect(applyDebounce([])).toEqual([])
    })
})