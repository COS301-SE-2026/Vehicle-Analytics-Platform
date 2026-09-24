const { ensureWeather } = require('../src/services/weatherService');
const { toLocalDate, addDays, datesBetween } = require('../src/utils/dateUtils');

const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const CELL = { lat: -25.7, lon: 28.2 };

const today = () => toLocalDate(new Date());

// A db that returns `cached` for the lookup query and records inserts.
function fakeDb(cached = []) {
    const inserts = [];
    return {
        inserts,
        query: jest.fn(async (sql, params) => {
            if (sql.trim().startsWith('INSERT')) {
                inserts.push(params);
                return { rows: [] };
            }
            return { rows: cached };
        }),
    };
}

// One Open-Meteo result covering the requested dates.
function dailyFor(start, end, overrides = {}) {
    const days = datesBetween(start, end);
    return {
        daily: {
            time: days,
            precipitation_sum: days.map(() => 2.5),
            temperature_2m_max: days.map(() => 21),
            temperature_2m_min: days.map(() => 9),
            ...overrides,
        },
    };
}

// Answers like Open-Meteo: one object for one location, an array for several.
function okResponse(url) {
    const params = new URL(url).searchParams;
    const count = params.get('latitude').split(',').length;
    const one = dailyFor(params.get('start_date'), params.get('end_date'));
    return {
        ok: true,
        status: 200,
        json: async () => (count === 1 ? one : Array(count).fill(one)),
    };
}

const params = (url) => new URL(url).searchParams;

beforeEach(() => {
    global.fetch = jest.fn(async (url) => okResponse(url));
    // Make the batch pauses and rate-limit waits instant.
    jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
        fn();
        return 0;
    });
});

afterEach(() => {
    jest.restoreAllMocks();
    delete global.fetch;
});

describe('ensureWeather', () => {
    test('does nothing when there are no cells', async () => {
        const db = fakeDb();
        await ensureWeather(db, [], addDays(today(), -10), today());

        expect(db.query).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });

    test('does nothing for a range entirely in the future', async () => {
        const db = fakeDb();
        await ensureWeather(db, [CELL], addDays(today(), 2), addDays(today(), 5));

        expect(db.query).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });

    test('does not fetch when every day is already cached', async () => {
        const from = addDays(today(), -20);
        const to = addDays(today(), -15);
        const cached = datesBetween(from, to).map((day) => ({ lat: CELL.lat, lon: CELL.lon, day }));

        await ensureWeather(fakeDb(cached), [CELL], from, to);

        expect(fetch).not.toHaveBeenCalled();
    });

    test('fetches only the missing cell', async () => {
        const from = addDays(today(), -20);
        const to = addDays(today(), -15);
        const other = { lat: -33.9, lon: 18.4 };
        const cached = datesBetween(from, to).map((day) => ({ lat: CELL.lat, lon: CELL.lon, day }));

        await ensureWeather(fakeDb(cached), [CELL, other], from, to);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(params(fetch.mock.calls[0][0]).get('latitude')).toBe('-33.9');
    });

    test('uses the archive API for older days', async () => {
        const from = addDays(today(), -20);
        const to = addDays(today(), -15);
        const db = fakeDb();

        await ensureWeather(db, [CELL], from, to);

        expect(fetch).toHaveBeenCalledTimes(1);
        const url = fetch.mock.calls[0][0];
        expect(url.startsWith(ARCHIVE)).toBe(true);
        expect(params(url).get('start_date')).toBe(from);
        expect(params(url).get('end_date')).toBe(to);
        expect(params(url).get('timezone')).toBe('Africa/Johannesburg');
    });

    test('uses the forecast API for recent days', async () => {
        await ensureWeather(fakeDb(), [CELL], addDays(today(), -2), today());

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch.mock.calls[0][0].startsWith(FORECAST)).toBe(true);
    });

    test('splits a range across both APIs without overlap', async () => {
        await ensureWeather(fakeDb(), [CELL], addDays(today(), -10), today());

        expect(fetch).toHaveBeenCalledTimes(2);
        const [archiveUrl, forecastUrl] = fetch.mock.calls.map(([url]) => url);

        expect(archiveUrl.startsWith(ARCHIVE)).toBe(true);
        expect(params(archiveUrl).get('end_date')).toBe(addDays(today(), -7));
        expect(forecastUrl.startsWith(FORECAST)).toBe(true);
        expect(params(forecastUrl).get('start_date')).toBe(addDays(today(), -6));
        expect(params(forecastUrl).get('end_date')).toBe(today());
    });

    test('never asks for days after today', async () => {
        await ensureWeather(fakeDb(), [CELL], addDays(today(), -2), addDays(today(), 3));

        expect(params(fetch.mock.calls[0][0]).get('end_date')).toBe(today());
    });

    test('stores one row per cell and day, under the requested grid cell', async () => {
        const from = addDays(today(), -20);
        const to = addDays(today(), -16);
        const db = fakeDb();

        await ensureWeather(db, [{ lat: -25.73, lon: 28.18 }], from, to);

        expect(db.inserts).toHaveLength(1);
        const [lats, lons, days, precip, tmax, tmin] = db.inserts[0];
        expect(days).toEqual(datesBetween(from, to));
        expect(new Set(lats)).toEqual(new Set(['-25.7']));
        expect(new Set(lons)).toEqual(new Set(['28.2']));
        expect(precip.every((p) => p === 2.5)).toBe(true);
        expect(tmax.every((t) => t === 21)).toBe(true);
        expect(tmin.every((t) => t === 9)).toBe(true);
    });

    test('skips days the model has no data for', async () => {
        const from = addDays(today(), -20);
        const to = addDays(today(), -18);
        fetch.mockImplementationOnce(async () => ({
            ok: true,
            status: 200,
            json: async () => dailyFor(from, to, { precipitation_sum: [1, null, 3] }),
        }));
        const db = fakeDb();

        await ensureWeather(db, [CELL], from, to);

        expect(db.inserts[0][2]).toEqual([from, addDays(from, 2)]);
    });

    test('sends at most 50 cells per request', async () => {
        const cells = Array.from({ length: 51 }, (_, i) => ({ lat: -20 - i * 0.1, lon: 28.2 }));

        await ensureWeather(fakeDb(), cells, addDays(today(), -20), addDays(today(), -18));

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(params(fetch.mock.calls[0][0]).get('latitude').split(',')).toHaveLength(50);
        expect(params(fetch.mock.calls[1][0]).get('latitude').split(',')).toHaveLength(1);
    });

    test('retries after a rate limit', async () => {
        fetch.mockImplementationOnce(async () => ({ ok: false, status: 429 }));
        const db = fakeDb();

        await ensureWeather(db, [CELL], addDays(today(), -20), addDays(today(), -18));

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(db.inserts).toHaveLength(1);
    });

    test('gives up after repeated rate limits', async () => {
        fetch.mockImplementation(async () => ({ ok: false, status: 429 }));

        await expect(
            ensureWeather(fakeDb(), [CELL], addDays(today(), -20), addDays(today(), -18)),
        ).rejects.toThrow('rate limit');
    });

    test('throws on other failed responses', async () => {
        fetch.mockImplementationOnce(async () => ({ ok: false, status: 500 }));

        await expect(
            ensureWeather(fakeDb(), [CELL], addDays(today(), -20), addDays(today(), -18)),
        ).rejects.toThrow('Open-Meteo request failed (500)');
    });
});