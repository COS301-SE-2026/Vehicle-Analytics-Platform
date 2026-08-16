const { pool } = require('../db/pool');
const { success, error } = require('../utils/response');


const CONDITION_TYPES = [
    'speed_threshold',
    'time_based_restriction',
    'repeated_unsafe_events',
    'safety_score_drop',
    'trip_duration_exceeded',
];

const KNOWN_EVENTS_TYPES = ['harsh_braking', 'harsh_acceleration', 'harsh_cornering'];

const VALID_DAYS = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];

function isValidTimeString(value) {
    return typeof value === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

