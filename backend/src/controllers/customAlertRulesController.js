const { pool } = require('../db/pool');
const { success, error } = require('../utils/response');


const CONDITION_TYPES = [
    'speed_threshold',
    'time_based_restriction',
    'repeated_unsafe_events',
    'safety_score_drop',
    'trip_duration_exceeded',
];

const KNOWN_EVENT_TYPES = new Set(['harsh_braking', 'harsh_acceleration', 'harsh_cornering']);

function isValidTimeString(value) {
    return typeof value === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function validateTopLevelFields({ name, fleet_group_id}) {
    const errors = [];

    if(!name || typeof name !== 'string' || name.trim().length === 0){
        error.push('name is required');
    }

    if(!fleet_group_id){
        errors.push('fleet_group_id is require')
    }

    return errors;
}

function validateSpeedThreshold(condition_params){
    const errors = [];

    const { max_speed_kmh } = condition_params;

    if(max_speed_kmh === undefined || max_speed_kmh === null){
        errors.push('max_speed_kmh is required');
    } else if(typeof max_speed_kmh !== 'number' || max_speed_kmh <= 0){
        errors.push('max_speed_kmh must be a positive number');
    }
    
    return errors;
}

function validateTimeWindow(start_time, end_time){
    const errors = [];

    if(!start_time || !isValidTimeString(start_time)){
        errors.push('start_time is required and must be in HH:MM format');
    }

    if(!end_time || !isValidTimeString(end_time)){
        errors.push('end_time is required and must be in HH:MM format');
    }

    if (isValidTimeString(start_time) && isValidTimeString(end_time) && start_time === end_time) {
        errors.push('end_time must be different from start_time');
    }
    return errors;

}

function validateRestrictedDays(restricted_days){
    const errors = [];

    if(restricted_days === undefined){
        return errors;
    }

    if( !Array.isArray(restricted_days) || restricted_days.length === 0 ){
        error.push('restricted_days must be a non-empty array is provided');

        return errors;
    }

    const invalidDays = restricted_days.filter(d => !VALID_DAYS.has(d));

    if(invalidDays.length > 0){
        errors.push(`restricted_days contains invalid values: ${invalidDays.join(', ')}`);
    }

    return errors;
}

function validateTimebasedRestriction(condition_params){
    const { start_time, end_time, restricted_days } = condition_params;

    return[
        ...validateTimeWindow(start_time, end_time),

        ...validateRestrictedDays(restricted_days),
    ];
}
      

function validateEventTypes(event_types){
    const errors = [];

    if(!Array.isArray(event_types) || event_types.length === 0){
            errors.push('event_types must be a non-empty array');

            return errors;
    } 
    const invalidTypes = event_types.filter(t => !KNOWN_EVENT_TYPES.has(t));

    if(invalidTypes.length > 0){
        errors.push(`event_types contains invalid values: ${invalidTypes.join(', ')}`);
    }

    return errors;
}

function validateCountAndWindow(count, window_minutes){
    const errors = [];

     if(count === undefined || count === null){
            errors.push('count is required');
        } else if (!Number.isInteger(count) || count <=0 ) {
            errors.push('count must be a positive integer');
        }

        if(window_minutes === undefined || window_minutes === null){
            errors.push('window_minutes is required ');
        } else if( typeof window_minutes !== 'number' || window_minutes <= 0) {
            errors.push('window_minutes must be a positive number');
        }

        return errors;
}

function validateRepeatedUnsafeEvents(condition_params){
    const { event_types, count, window_minutes} = condition_params;

    return [
        ...validateEventTypes(event_types),

        ...validateCountAndWindow(count, window_minutes),
    ];
}


function validateSafetyScoreDrop(condition_params){
    const errors = [];

    const { min_score } = condition_params;

    if(min_score === undefined || min_score === null){
        errors.push('min_score is required');
    } else if (typeof min_score !== 'number' || min_score < 0 || min_score > 100){
        errors.push('min_score must be a number between 0 and 100');
    }

    return errors;

}

function validateTripDurationExceeded(condition_params){
    const errors = [];

    const { max_trip_minutes, max_daily_minutes } = condition_params;

        if(max_trip_minutes === undefined && max_daily_minutes === undefined){
            errors.push('at least one of max_trip_minutes or max_daily_minutes is required');
        }
        
        if(max_trip_minutes !== undefined && (typeof max_trip_minutes !== 'number' || max_trip_minutes <= 0)){
            errors.push('max_trip_minutes must be a positive number');
        }

        if(max_daily_minutes !== undefined && (typeof max_daily_minutes !== 'number' || max_daily_minutes <= 0)){
            errors.push('max_daily_minutes must be a positive number');
        }

    return errors;

}
const CONDITION_PARAM_VALIDATORS ={
    speed_threshold: validateSpeedThreshold,

    time_based_restriction: validateTimebasedRestriction,

    repeated_unsafe_events: validateRepeatedUnsafeEvents,

    safety_score_drop: validateSafetyScoreDrop,

    trip_duration_exceeded: validateTripDurationExceeded,
};

function validateRuleFields({ name, fleet_group_id, condition_type, condition_params }){
    const errors = validateTopLevelFields({ name, fleet_group_id});

    if(!CONDITION_TYPES.has(condition_type)){
        errors.push(`condition_type must be one of: ${[...CONDITION_TYPES].join(', ')}`);

        return errors;
    }

    if(!condition_params || typeof condition_params !== 'object'){
        errors.push('condition_params is required');

        return errors;
    }

    return [...errors, ...CONDITION_PARAM_VALIDATORS[condition_type](condition_params)];
}


async function createRule(req, res){
    const managerId = req.user.id;

    const { name, fleet_group_id, condition_type, condition_params } = req.body;

    const validateErrors = validateRuleFields({ name, fleet_group_id, condition_type, condition_params});

    if(validateErrors.length > 0){
        return error(res, validateErrors.join('; '), 400);
    }

    try{
        const assignmentResult = await pool.query(
            `SELECT 1 FROM fleet_manager_assignments WHERE fleet_manager_id = $1 and fleet_group_id = $2`,
            [managerId, fleet_group_id]
        );

        if(assignmentResult.rows.length === 0){
            return error(res, 'You are not assigned to this fleet group', 403);
        }

        const result = await pool.query(
            `INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params)
            VALUES ($1,$2, $3, $4, $5)
            RETURNING *`,
            [managerId, fleet_group_id, name, condition_type, condition_params]
        );

        return success(res, result.rows[0], 201); 
    } catch (err) {
        console.error('Create custom alert rule error:', err);
        
        return error(res, 'Failed to create custom alert rule: ' + err.message, 500);
    }
}

module.exports = {createRule};