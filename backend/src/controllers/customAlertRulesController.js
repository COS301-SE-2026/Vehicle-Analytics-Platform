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

    if(condition_type === 'speed_threshold'){
        const { max_speed_kmh } = condition_params;

        if(max_speed_kmh === undefined || max_speed_kmh === null){
            error.push('max_speed_kmh is required');
        } else if(typeof max_speed_kmh !== 'number' || max_speed_kmh <= 0){
            errors.push('max_speed_kmh must be a positive number');
        }
    }

    if(condition_type === 'time_based_restriction'){
        const {start_time, end_time, restricted_days } = condition_params;

        if(!start_time || !isValidTimeString(start_time)){
            errors.push('start_time is required and must be in HH:MM format');
        }

        if(!end_time || !isValidTimeString(end_time)){
            errors.push('end_time is required and must be in HH:MM format');
        }

        if(start_time && end_time && isValidTimeString(start_time) && isValidTimeString(end_time) && start_time === end_time){
            errors.push('end_time must be different from start_time');
        }

        if(restricted_days !== undefined){
            if( !Array.isArray(restricted_days) || restricted_days.length === 0 ){
                error.push('restricted_days must be a non-empty array is provided');
            } else {
                const invalidDays = restricted_days.filter(d => !VALID_DAYS.includes(d));

                if(invalidDays.length > 0){
                    errors.push(`restricted_days contains invalid values: ${invalidDays.join(', ')}`);
                }
            }
        }
    }
    
}