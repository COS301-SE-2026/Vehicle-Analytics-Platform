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

function fromWall(wall) { return new Date(wall.getTime() - OFFSET_MS);}


function startOfDayWall(wall) {
  return new Date(Date.UTC(
    wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate(),
  ));
}