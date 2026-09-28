'use strict';

const REPORT_TIMEZONE = 'Africa/Johannesburg';

function toLocalDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat('en-CA', { timeZone: REPORT_TIMEZONE }).format(date);
}

function addDays(isoDate, n) {
    const d = new Date(`${isoDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

function datesBetween(from, to) {
    const out = [];
    for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
    return out;
}

function minDate(a, b) {
    return a <= b ? a : b;
}

function maxDate(a, b) {
    return a >= b ? a : b;
}

module.exports = {
    REPORT_TIMEZONE,
    toLocalDate,
    addDays,
    datesBetween,
    minDate,
    maxDate,
};