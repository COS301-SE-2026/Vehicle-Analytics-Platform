'use strict';

const REPORT_TZ_OFFSET_HOURS = 2;
const OFFSET_MS = REPORT_TZ_OFFSET_HOURS * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_CUSTOM_PERIOD_DAYS = 366;

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function toWall(instant) {
    return new Date(instant.getTime() + OFFSET_MS);
}

function fromWall(wall) {
    return new Date(wall.getTime() - OFFSET_MS);
}

function startOfDayWall(wall) {
    return new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()));
}

function startOfWeekWall(wall) {
    const day = wall.getUTCDay();
    const daysSinceMonday = (day + 6) % 7;
    const midnight = startOfDayWall(wall);
    return new Date(midnight.getTime() - daysSinceMonday * MS_PER_DAY);
}

function startOfMonthWall(wall) {
    return new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), 1));
}

function addDaysWall(wall, days) {
    return new Date(wall.getTime() + days * MS_PER_DAY);
}

function addMonthsWall(wall, months) {
    return new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth() + months, 1));
}

function toDateString(wall) {
    const y = wall.getUTCFullYear();
    const m = String(wall.getUTCMonth() + 1).padStart(2, '0');
    const d = String(wall.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatDayMonth(wall) {
    return `${wall.getUTCDate()} ${MONTH_NAMES[wall.getUTCMonth()].slice(0, 3)}`;
}

function buildRange(fromWallDate, toWallDate, label) {
    const lastDayWall = new Date(toWallDate.getTime() - MS_PER_DAY);
    const days = Math.round((toWallDate.getTime() - fromWallDate.getTime()) / MS_PER_DAY);

    return {
        from: fromWall(fromWallDate),
        to: fromWall(toWallDate),
        fromDate: toDateString(fromWallDate),
        toDate: toDateString(lastDayWall),
        days,
        label,
    };
}

function weekLabel(startWall, endExclusiveWall) {
    const lastDay = new Date(endExclusiveWall.getTime() - MS_PER_DAY);
    const sameMonth = startWall.getUTCMonth() === lastDay.getUTCMonth();
    const year = lastDay.getUTCFullYear();

    if (sameMonth) {
        return `${startWall.getUTCDate()} - ${lastDay.getUTCDate()} `
            + `${MONTH_NAMES[lastDay.getUTCMonth()].slice(0, 3)} ${year}`;
    }
    return `${formatDayMonth(startWall)} - ${formatDayMonth(lastDay)} ${year}`;
}

function rangeLabel(startWall, endExclusiveWall) {
    const lastDay = new Date(endExclusiveWall.getTime() - MS_PER_DAY);

    if (startWall.getTime() === lastDay.getTime()) {
        return `${formatDayMonth(startWall)} ${startWall.getUTCFullYear()}`;
    }
    return `${formatDayMonth(startWall)} - ${formatDayMonth(lastDay)} ${lastDay.getUTCFullYear()}`;
}

function monthLabel(startWall) {
    return `${MONTH_NAMES[startWall.getUTCMonth()]} ${startWall.getUTCFullYear()}`;
}

const PERIOD_TYPES = ['weekly', 'monthly', 'current', 'custom'];
const ANCHORED_PERIOD_TYPES = ['weekly', 'monthly', 'current'];

function resolveWeekly(anchor) {
    const thisWeekStart = startOfWeekWall(toWall(anchor));
    const start = addDaysWall(thisWeekStart, -7);
    const end = thisWeekStart;
    const prevStart = addDaysWall(start, -7);

    return {
        type: 'weekly',
        ...buildRange(start, end, weekLabel(start, end)),
        previous: buildRange(prevStart, start, weekLabel(prevStart, start)),
    };
}

function resolveMonthly(anchor) {
    const thisMonthStart = startOfMonthWall(toWall(anchor));
    const start = addMonthsWall(thisMonthStart, -1);
    const end = thisMonthStart;
    const prevStart = addMonthsWall(start, -1);

    return {
        type: 'monthly',
        ...buildRange(start, end, monthLabel(start)),
        previous: buildRange(prevStart, start, monthLabel(prevStart)),
    };
}

function resolveCurrent(anchor, currentDays) {
    if (!Number.isInteger(currentDays) || currentDays < 1) {
        throw new Error('currentDays must be a positive integer');
    }

    const end = addDaysWall(startOfDayWall(toWall(anchor)), 1);
    const start = addDaysWall(end, -currentDays);
    const prevStart = addDaysWall(start, -currentDays);
    const label = `Last ${currentDays} days to ${formatDayMonth(new Date(end.getTime() - MS_PER_DAY))}`;
    const prevLabel = `Previous ${currentDays} days`;

    return {
        type: 'current',
        ...buildRange(start, end, label),
        previous: buildRange(prevStart, start, prevLabel),
    };
}

function resolveCustom(from, to) {
    const fromDate = from instanceof Date ? from : new Date(from);
    const toDate = to instanceof Date ? to : new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        throw new Error("Custom period requires valid 'from' and 'to' dates");
    }

    const startWall = startOfDayWall(toWall(fromDate));
    const lastDayWall = startOfDayWall(toWall(toDate));

    if (lastDayWall.getTime() < startWall.getTime()) {
        throw new Error("Custom period 'to' must not be before 'from'");
    }

    const endWall = addDaysWall(lastDayWall, 1);
    const days = Math.round((endWall.getTime() - startWall.getTime()) / MS_PER_DAY);

    if (days > MAX_CUSTOM_PERIOD_DAYS) {
        throw new Error(`Custom period may not exceed ${MAX_CUSTOM_PERIOD_DAYS} days`);
    }

    const prevStart = addDaysWall(startWall, -days);

    return {
        type: 'custom',
        ...buildRange(startWall, endWall, rangeLabel(startWall, endWall)),
        previous: buildRange(prevStart, startWall, rangeLabel(prevStart, startWall)),
    };
}

function resolvePeriod({ periodType, anchor, from, to, currentDays = 7 } = {}) {
    if (!PERIOD_TYPES.includes(periodType)) {
        throw new Error(
            `Unknown periodType '${periodType}'. Expected one of: ${PERIOD_TYPES.join(', ')}`,
        );
    }

    if (ANCHORED_PERIOD_TYPES.includes(periodType)) {
        if (!(anchor instanceof Date) || Number.isNaN(anchor.getTime())) {
            throw new Error('resolvePeriod requires a valid Date anchor');
        }
    }

    switch (periodType) {
        case 'weekly':
            return resolveWeekly(anchor);
        case 'monthly':
            return resolveMonthly(anchor);
        case 'current':
            return resolveCurrent(anchor, currentDays);
        case 'custom':
            return resolveCustom(from, to);
        default:
            throw new Error(`Unhandled periodType '${periodType}'`);
    }
}

function weeksInPeriod(period) {
    if (!period || !(period.from instanceof Date) || !(period.to instanceof Date)) {
        throw new Error('weeksInPeriod requires a resolved period with Date bounds');
    }

    const startWall = toWall(period.from);
    const endWall = toWall(period.to);
    let cursor = startOfWeekWall(startWall);

    if (cursor.getTime() < startWall.getTime()) {
        cursor = addDaysWall(cursor, 7);
    }

    const weeks = [];
    let index = 1;

    while (cursor.getTime() < endWall.getTime()) {
        const weekEnd = addDaysWall(cursor, 7);
        weeks.push({
            index,
            ...buildRange(cursor, weekEnd, `Week ${index}`),
            dateLabel: weekLabel(cursor, weekEnd),
        });
        cursor = weekEnd;
        index += 1;
    }

    return weeks;
}

function trendCoverage(period, weeks) {
    if (!weeks.length) {
        return {
            covered: false,
            totalDays: period.days,
            coveredDays: 0,
            leadInDays: period.days,
            spillDays: 0,
        };
    }

    const first = weeks[0];
    const last = weeks[weeks.length - 1];

    const leadInDays = Math.round((first.from.getTime() - period.from.getTime()) / MS_PER_DAY);
    const spillDays = Math.max(
        0,
        Math.round((last.to.getTime() - period.to.getTime()) / MS_PER_DAY),
    );

    return {
        covered: true,
        totalDays: period.days,
        coveredDays: period.days - leadInDays,
        leadInDays,
        spillDays,
        firstDate: first.fromDate,
        lastDate: last.toDate,
    };
}

let dataNowFnPresent = null;

async function getDataClock(db) {
    if (!db || typeof db.query !== 'function') {
        throw new Error('getDataClock requires a pg client or pool');
    }

    if (dataNowFnPresent === null) {
        const probe = await db.query("SELECT to_regproc('data_now') IS NOT NULL AS present");
        dataNowFnPresent = Boolean(probe.rows[0] && probe.rows[0].present);
    }

    if (dataNowFnPresent) {
        const result = await db.query('SELECT data_now() AS data_now');
        const value = result.rows[0] && result.rows[0].data_now;
        if (value) return new Date(value);
    }

    const fallback = await db.query(
        'SELECT MAX(last_update) AS data_now FROM current_vehicle_position',
    );
    const value = fallback.rows[0] && fallback.rows[0].data_now;

    return value ? new Date(value) : new Date();
}

function _resetDataClockProbe() {
    dataNowFnPresent = null;
}

module.exports = {
    resolvePeriod,
    weeksInPeriod,
    trendCoverage,
    getDataClock,
    PERIOD_TYPES,
    REPORT_TZ_OFFSET_HOURS,
    MAX_CUSTOM_PERIOD_DAYS,
    _resetDataClockProbe,
};