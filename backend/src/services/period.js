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