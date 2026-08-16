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

function validateRuleFields({ name, fleet_group_id, condition_type, condition_params}) {
    const errors = [];

    if(!name || typeof name !== 'string' || name.trim().length === 0){
        error.push('name is required');
    }

    if(!fleet_group_id){
        errors.push('fleet_group_id is require')
    }

    if (!CONDITION_TYPES.includes(condition_type)){
        error.push(`condition_type must be one of: ${CONDITION_TYPES.join(', ')}`);

        return errors;
    }

    if(!condition_params || typeof condition_params !== 'object'){
        errors.push('condition_params is required');

        return errors;
    }

    
}