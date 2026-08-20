'use strict'; 


const REPORT_TZ_OFFSET_HOURS = 2;
const OFFSET_MS = REPORT_TZ_OFFSET_HOURS * 60 * 60 * 1000;
 
const MS_PER_DAY = 24 * 60 * 60 * 1000;
 
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toWall(instant){
    return new Date(instant.getTime() + OFFSET_MS);
}

function fromWall(wall) { 
  return new Date(wall.getTime() - OFFSET_MS);
}


function startOfDayWall(wall) {
  return new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate(),));
}

function startOfWeekWall(wall) { // here i just said that the first day is mnday, so thats day 1 essentially and sunday being day 7
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

// range
function buildRange(fromWallDate, toWallDate, label) {
  const lastDayWall = new Date(toWallDate.getTime() - MS_PER_DAY);
  const days = Math.round((toWallDate.getTime() - fromWallDate.getTime()) / MS_PER_DAY);
 
  return {
    from: fromWall(fromWallDate),
    to: fromWall(toWallDate), 
    fromDate: toDateString(fromWallDate),
    toDate: toDateString(lastDayWall), 
    days, label,
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
 
function monthLabel(startWall) {
  return `${MONTH_NAMES[startWall.getUTCMonth()]} ${startWall.getUTCFullYear()}`;
}


// period resolution 
const PERIOD_TYPES = ['weekly', 'monthly', 'current', 'custom'];
function resolvePeriod({ periodType, anchor, from, to, currentDays = 7 } = {}) {
  if (!PERIOD_TYPES.includes(periodType)) {
    throw new Error(
      `Unknown periodType '${periodType}'. Expected one of: ${PERIOD_TYPES.join(', ')}`,
    );
  }
  if (!(anchor instanceof Date) || Number.isNaN(anchor.getTime())) {
    throw new Error('resolvePeriod requires a valid Date anchor');
  }
 
  switch (periodType) {
    case 'weekly':   return resolveWeekly(anchor);
    case 'monthly':  return resolveMonthly(anchor);
    case 'current':  return resolveCurrent(anchor, currentDays);
    case 'custom':   return resolveCustom(from, to);
    default:         throw new Error(`Unhandled periodType '${periodType}'`);
  }
}


function resolveWeekly(anchor) {
  const thisWeekStart = startOfWeekWall(toWall(anchor));
  const start = addDaysWall(thisWeekStart, -7);
  const end = thisWeekStart;
 
  const prevStart = addDaysWall(start, -7);
 
  return {
    type: 'weekly', ...buildRange(start, end, weekLabel(start, end)),
    previous: buildRange(prevStart, start, weekLabel(prevStart, start)),
  };
}


function resolveMonthly(anchor) {
  const thisMonthStart = startOfMonthWall(toWall(anchor));
  const start = addMonthsWall(thisMonthStart, -1);
  const end = thisMonthStart;
 
  const prevStart = addMonthsWall(start, -1);
 
  return {
    type: 'monthly', ...buildRange(start, end, monthLabel(start)),
    previous: buildRange(prevStart, start, monthLabel(prevStart)),
  };
}