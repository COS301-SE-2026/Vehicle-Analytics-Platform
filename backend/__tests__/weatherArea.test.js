// Unit tests for src/services/weatherAreaAnalytics.js
// The statistics are tested directly through _internal. The report itself is
// tested with a fake db that answers each query by recognising its SQL.

jest.mock('../src/services/weatherService', () => ({
    ensureWeather: jest.fn().mockResolvedValue(true),
}));

const { ensureWeather } = require('../src/services/weatherService');
const {
    getWeatherAreaReport,
    EVENTS,
    MAX_DAYS,
    _internal: {
        rateRatio,
        mantelHaenszelRateRatio,
        poissonUpperTail,
        poissonLowerTail,
        compareToExpected,
        shrunkRate,
        probWithin,
        detectGapDays,
        detectNotReported,
    },
} = require('../src/services/weatherAreaAnalytics');

const zeroEvents = () => Object.fromEntries(EVENTS.map(({ key }) => [key, 0]));

describe('rateRatio', () => {
    test('returns null when either side has no distance', () => {
        expect(rateRatio(5, 0, 5, 100)).toBeNull();
        expect(rateRatio(5, 100, 5, 0)).toBeNull();
    });

    test('returns null when both sides have zero events', () => {
        expect(rateRatio(0, 100, 0, 100)).toBeNull();
    });

    test('a doubling on small counts is not significant', () => {
        const r = rateRatio(20, 1000, 10, 1000);
        expect(r.ratio).toBe(2);
        expect(r.low).toBeLessThan(1);
        expect(r.significant).toBe(false);
    });

    test('the same doubling on large counts is significant', () => {
        const r = rateRatio(200, 1000, 100, 1000);
        expect(r.ratio).toBe(2);
        expect(r.low).toBeGreaterThan(1);
        expect(r.significant).toBe(true);
    });

    test('a zero count still gives a finite interval', () => {
        const r = rateRatio(0, 1000, 10, 1000);
        expect(Number.isFinite(r.ratio)).toBe(true);
        expect(Number.isFinite(r.high)).toBe(true);
        expect(r.ratio).toBeLessThan(1);
    });
});

describe('mantelHaenszelRateRatio', () => {
    const stratum = (wetEvents, wetKm, dryEvents, dryKm) => ({
        wet: { events: { k: wetEvents }, eventKm: { k: wetKm } },
        dry: { events: { k: dryEvents }, eventKm: { k: dryKm } },
    });

    test('with one area it matches the crude ratio', () => {
        expect(mantelHaenszelRateRatio([stratum(20, 1000, 10, 1000)], 'k').ratio).toBe(2);
    });

    test('removes a false weather effect caused by where it rained', () => {
        // Risky area: 10 per 100 km in both wet and dry, but mostly driven dry.
        // Safe area: 1 per 100 km in both, but mostly driven wet.
        const strata = [stratum(10, 100, 90, 900), stratum(9, 900, 1, 100)];

        const crude = rateRatio(19, 1000, 91, 1000);
        expect(crude.significant).toBe(true);
        expect(crude.ratio).toBeLessThan(0.5);

        const adjusted = mantelHaenszelRateRatio(strata, 'k');
        expect(adjusted.ratio).toBe(1);
        expect(adjusted.significant).toBe(false);
    });

    test('skips areas without both wet and dry driving', () => {
        const strata = [
            stratum(20, 1000, 10, 1000),
            { wet: stratum(50, 100, 0, 0).wet, dry: undefined },
        ];
        expect(mantelHaenszelRateRatio(strata, 'k').ratio).toBe(2);
    });

    test('returns null when nothing can be compared', () => {
        expect(mantelHaenszelRateRatio([], 'k')).toBeNull();
        expect(mantelHaenszelRateRatio([stratum(0, 100, 0, 100)], 'k')).toBeNull();
    });
});

describe('Poisson tails', () => {
    test('match known values', () => {
        expect(poissonUpperTail(1, 1)).toBeCloseTo(1 - Math.exp(-1), 10);
        expect(poissonLowerTail(0, 2)).toBeCloseTo(Math.exp(-2), 10);
        expect(poissonUpperTail(10, 2)).toBeCloseTo(4.65e-5, 7);
    });

    test('edge cases', () => {
        expect(poissonUpperTail(0, 5)).toBe(1);
        expect(poissonLowerTail(-1, 5)).toBe(0);
    });

    test.each([
        [0, 0.5], [3, 2], [5, 5], [12, 7.3], [40, 55],
    ])('lower and upper tails add up to 1 (k = %i, mu = %f)', (k, mu) => {
        expect(poissonLowerTail(k, mu) + poissonUpperTail(k + 1, mu)).toBeCloseTo(1, 10);
    });
});

describe('compareToExpected', () => {
    test('no verdict when fewer than 5 events are expected', () => {
        expect(compareToExpected(3, 4).status).toBe('insufficient_data');
        expect(compareToExpected(0, 0).status).toBe('insufficient_data');
    });

    test('flags clearly higher counts', () => {
        const r = compareToExpected(40, 17.5);
        expect(r.status).toBe('above_fleet');
        expect(r.pValue).toBeLessThan(0.001);
    });

    test('flags clearly lower counts', () => {
        expect(compareToExpected(10, 32.5).status).toBe('below_fleet');
    });

    test('small differences are in line without a test', () => {
        const r = compareToExpected(12, 10);
        expect(r.status).toBe('in_line');
        expect(r.pValue).toBeNull();
    });

    test('large differences that could be chance stay in line', () => {
        const r = compareToExpected(30, 20);
        expect(r.status).toBe('in_line');
        expect(r.pValue).toBeGreaterThan(0.001);
    });
});

describe('shrunkRate and probWithin', () => {
    test('no data gives the parent rate', () => {
        expect(shrunkRate(0, 0, 5)).toBe(5);
    });

    test('data is pulled towards the parent by 1000 km', () => {
        expect(shrunkRate(100, 1000, 5)).toBeCloseTo(7.5);
    });

    test('without a parent it is the plain rate', () => {
        expect(shrunkRate(10, 1000, null)).toBe(1);
    });

    test('probability of at least one event in 10 km', () => {
        expect(probWithin(null)).toBeNull();
        expect(probWithin(0)).toBe(0);
        expect(probWithin(10)).toBeCloseTo(1 - Math.exp(-1));
    });
});

describe('detectGapDays', () => {
    const day = (d, km, braking) => ({ day: d, km, events: { ...zeroEvents(), harsh_braking: braking } });

    test('marks a day with far fewer events than its driving predicts', () => {
        const days = [
            day('2026-09-01', 2000, 50),
            day('2026-09-02', 2000, 48),
            day('2026-09-03', 2000, 52),
            day('2026-09-04', 2000, 2),
            day('2026-09-05', 2000, 50),
        ];
        const gaps = detectGapDays(days);
        expect(gaps.harsh_braking).toEqual(['2026-09-04']);
        expect(gaps.over_speeding).toEqual([]);
    });

    test('ignores light days where few events are expected', () => {
        const days = [
            day('2026-09-01', 2000, 50),
            day('2026-09-02', 2000, 50),
            day('2026-09-03', 100, 0),
        ];
        expect(detectGapDays(days).harsh_braking).toEqual([]);
    });
});

describe('detectNotReported', () => {
    const row = (vehicleId, km, braking) => {
        const r = { vehicle_id: vehicleId, ...zeroEvents(), harsh_braking: braking };
        for (const { key } of EVENTS) r[`km_${key}`] = km;
        return r;
    };

    test('flags a vehicle with no events where the fleet expects 20 or more', () => {
        const { notReported, counts } = detectNotReported([row('A', 1000, 0), row('B', 1000, 50)]);
        expect(notReported.get('A')).toEqual(new Set(['harsh_braking']));
        expect(notReported.has('B')).toBe(false);
        expect(counts.harsh_braking).toBe(1);
    });

    test('does not flag a vehicle that drove too little to judge', () => {
        const { notReported } = detectNotReported([row('A', 100, 0), row('B', 1000, 50)]);
        expect(notReported.has('A')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// getWeatherAreaReport with a fake database
// ---------------------------------------------------------------------------

const END = '2026-09-23';

function groupedRow(vehicleId, km, braking) {
    const r = {
        vehicle_id: vehicleId, area_id: '1', condition: 'dry', in_period: true, km,
        ...zeroEvents(), harsh_braking: braking,
    };
    for (const { key } of EVENTS) r[`km_${key}`] = km;
    return r;
}

function vehicleDayRow(vehicleId, braking) {
    return { vehicle_id: vehicleId, day: END, ...zeroEvents(), harsh_braking: braking };
}

// Answers each query by recognising its SQL. Override any answer per test.
function fakeDb(overrides = {}) {
    const answers = {
        unbuilt: [],
        cells: [],
        stats: [{
            wet_area_days: 0, dry_area_days: 1, wet_calendar_days: 0,
            vehicle_days_missing_distance: 0, period_km: 2000, period_unknown_weather_km: 0,
        }],
        vehicleDays: [vehicleDayRow('A', 40), vehicleDayRow('B', 10)],
        grouped: [groupedRow('A', 1000, 40), groupedRow('B', 1000, 10)],
        daily: [{ day: END, condition: 'dry', km: 2000, ...zeroEvents(), harsh_braking: 50 }],
        areaDetail: [{
            area_id: '1', area_name: 'Clubview', city_name: 'Centurion',
            area_kind: 'suburb', day: END, precip: 0, tmax: 25,
        }],
        ...overrides,
    };

    return {
        query: jest.fn(async (sql) => {
            if (sql.includes('area_refresh_log')) return { rows: answers.unbuilt };
            if (sql.includes('SELECT DISTINCT ra.weather_lat')) return { rows: answers.cells };
            if (sql.includes('wet_area_days')) return { rows: answers.stats };
            if (sql.includes('HAVING SUM(km) > 0')) return { rows: answers.vehicleDays };
            if (sql.includes('GROUP BY vehicle_id, area_id, condition, in_period')) return { rows: answers.grouped };
            if (sql.includes('GROUP BY day, condition')) return { rows: answers.daily };
            if (sql.includes('ra.area_name')) return { rows: answers.areaDetail };
            throw new Error(`Unexpected query: ${sql.slice(0, 80)}`);
        }),
    };
}

describe('getWeatherAreaReport', () => {
    beforeEach(() => {
        ensureWeather.mockReset().mockResolvedValue(true);
    });

    test('MAX_DAYS is 7', () => {
        expect(MAX_DAYS).toBe(7);
    });

    test('an empty scope returns early without querying', async () => {
        const db = fakeDb();
        const report = await getWeatherAreaReport(db, [], { endDate: END, days: 7 });

        expect(db.query).not.toHaveBeenCalled();
        expect(report.warnings).toEqual(['There are no vehicles in the selected scope.']);
        expect(report.vehicles).toEqual([]);
    });

    test('works out the period and reference windows', async () => {
        const report = await getWeatherAreaReport(fakeDb(), ['A', 'B'], { endDate: END, days: 7 });

        expect(report.period).toEqual({ fromDate: '2026-09-17', toDate: END, days: 7 });
        expect(report.reference).toEqual({ fromDate: '2026-08-20', toDate: '2026-09-16', days: 28 });
    });

    test('fetches weather for the full window', async () => {
        const cells = [{ lat: -25.7, lon: 28.2 }];
        await getWeatherAreaReport(fakeDb({ cells }), ['A', 'B'], { endDate: END, days: 7 });

        expect(ensureWeather).toHaveBeenCalledWith(expect.anything(), cells, '2026-08-20', END);
    });

    test('calculates fleet rates from events and km', async () => {
        const report = await getWeatherAreaReport(fakeDb(), ['A', 'B'], { endDate: END, days: 7 });
        const braking = report.fleet.find((f) => f.key === 'harsh_braking');

        expect(braking.events).toBe(50);
        expect(braking.ratePer100Km).toBe(2.5);
        expect(braking.pPerVehicleDay).toBe(1);
        expect(report.coverage.vehiclesWithDriving).toBe(2);
        expect(report.coverage.periodKm).toBe(2000);
    });

    test('flags the vehicle above the fleet and the one below it', async () => {
        const report = await getWeatherAreaReport(fakeDb(), ['A', 'B'], { endDate: END, days: 7 });
        const byId = Object.fromEntries(report.vehicles.map((v) => [v.vehicleId, v]));

        expect(byId.A.metrics.harsh_braking.status).toBe('above_fleet');
        expect(byId.A.metrics.harsh_braking.expected).toBe(17.5);
        expect(byId.B.metrics.harsh_braking.status).toBe('below_fleet');
        expect(byId.A.status).toBe('above_fleet');
        expect(report.vehicles[0].vehicleId).toBe('A');
    });

    test('an area with the fleet rate is in line', async () => {
        const report = await getWeatherAreaReport(fakeDb(), ['A', 'B'], { endDate: END, days: 7 });

        expect(report.areas).toHaveLength(1);
        expect(report.areas[0].name).toBe('Clubview');
        expect(report.areas[0].metrics.harsh_braking.expected).toBe(50);
        expect(report.areas[0].metrics.harsh_braking.status).toBe('in_line');
    });

    test('warns when there is no reference driving', async () => {
        const report = await getWeatherAreaReport(fakeDb(), ['A', 'B'], { endDate: END, days: 7 });

        expect(report.warnings).toEqual(expect.arrayContaining([
            expect.stringContaining('no driving in the 28 days before'),
        ]));
    });

    test('warns about days whose area summaries are not built', async () => {
        const db = fakeDb({ unbuilt: [{ day: '2026-09-22' }, { day: END }] });
        const report = await getWeatherAreaReport(db, ['A', 'B'], { endDate: END, days: 7 });

        expect(report.warnings[0]).toContain('2026-09-22, 2026-09-23');
    });

    test('a weather failure becomes a warning, not an error', async () => {
        ensureWeather.mockRejectedValueOnce(new Error('Open-Meteo down'));
        jest.spyOn(console, 'error').mockImplementation(() => {});

        const report = await getWeatherAreaReport(fakeDb(), ['A', 'B'], { endDate: END, days: 7 });

        expect(report.warnings).toEqual(expect.arrayContaining([
            expect.stringContaining('Weather could not be fetched'),
        ]));
        expect(report.vehicles).toHaveLength(2);
        console.error.mockRestore();
    });

    test('no driving gives empty sections and a warning', async () => {
        const db = fakeDb({ grouped: [], vehicleDays: [], daily: [] });
        const report = await getWeatherAreaReport(db, ['A', 'B'], { endDate: END, days: 7 });

        expect(report.fleet).toEqual([]);
        expect(report.warnings).toEqual(expect.arrayContaining([
            'No driving was recorded for this scope in the selected period.',
        ]));
    });

    test('warns about vehicle-days with telemetry but no distance', async () => {
        const stats = [{
            wet_area_days: 0, dry_area_days: 1, wet_calendar_days: 0,
            vehicle_days_missing_distance: 3, period_km: 2000, period_unknown_weather_km: 0,
        }];
        const report = await getWeatherAreaReport(fakeDb({ stats }), ['A', 'B'], { endDate: END, days: 7 });

        expect(report.warnings).toEqual(expect.arrayContaining([
            expect.stringContaining('3 vehicle-days have telemetry but no daily distance'),
        ]));
    });
});