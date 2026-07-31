const {pool} = require('../db/pool');
const {success, error} = require('../utils/response');


async function createGeofence(req, res) {
    const { name, vehicle_id, boundary, trigger_type = 'both' } = req.body;

    if (!name || !boundary) {
        return error(res, 'Name and boundary data are required', 400);
    }

    try {
        const geojsonStr = JSON.stringify(boundary);

        const result = await pool.query(`
            INSERT INTO geofences (name, vehicle_id, boundary, trigger_type)
            VALUES ($1, $2, ST_GeomFromGeoJSON($3)::geometry(Polygon,4326), $4)
            RETURNING id, name, vehicle_id, ST_AsGeoJSON(boundary)::json AS boundary, trigger_type, created_at, updated_at
            `,
            [name, vehicle_id || null, geojsonStr, trigger_type]
        );

        return success(res, {
            message: 'Geofence created successfully',
            geofence: result.rows[0]
        }, 201);
    } catch (err) {
        console.error('Create geofence error:', err);
        return error(res, 'Failed to create geofence: ' + err.message, 500);
    }
}


async function getGeofences(req, res) {
    try{

        const { source } = req.query;
        const params = [];
        let where = '';
        if (source) {
            params.push(source);
            where = 'WHERE source = $1';
        }

        const result = await pool.query(`
            SELECT
                id,
                name,
                vehicle_id,
                ST_AsGeoJSON(boundary)::json AS boundary,
                trigger_type,
                source,
                hotspot_kind,
                created_at,
                updated_at
            FROM geofences
            ${where}
            ORDER BY created_at DESC
        `, params);

        return success(res, {
            total: result.rows.length,
            geofences: result.rows
        }, 200);
    }
    catch (err){
        console.error('Get geofences error:', err);
        return error(res, 'Failed to fetch geofences: '+err.message, 500);
    }
}


async function getGeofencesGeoJSON(req, res) {
    const { vehicle_id } = req.query;
    try {
        const result = await pool.query(`SELECT get_geofences_geojson($1) AS fc`, [vehicle_id || null]);
        return success(res, result.rows[0].fc, 200);
    } catch (err) {
        console.error('Get geofences GeoJSON error:', err);
        return error(res, 'Failed to fetch geofences geojson: ' + err.message, 500);
    }
}


async function getGeofenceById(req, res) {
    const {id} = req.params;
    try{
        const result = await pool.query(`
            SELECT id, name, vehicle_id, ST_AsGeoJSON(boundary)::json as boundary, trigger_type, created_at, updated_at
            FROM geofences
            WHERE id = $1
        `, [id]);

        if(result.rows.length===0){
            return error(res, 'Geofence not found', 404);
        }

        return success(res, {geofence: result.rows[0]}, 200);
    }
    catch (err){
        console.error('Get geofence by ID error:', err);
        return error(res, 'Failed to fetch geofence: '+err.message, 500);
    }
}

async function updateGeofence(req, res) {
    const { id } = req.params;
    const { name, boundary, trigger_type } = req.body;

    try {
        let query = 'UPDATE geofences SET updated_at = NOW()';
        const params = [];
        let paramCount = 1;

        if (name) {
            query += `, name = $${paramCount}`;
            params.push(name);
            paramCount++;
        }

        if (boundary) {
            query += `, boundary = ST_GeomFromGeoJSON($${paramCount})::geometry(Polygon,4326)`;
            params.push(JSON.stringify(boundary));
            paramCount++;
        }

        if (trigger_type) {
            query += `, trigger_type = $${paramCount}`;
            params.push(trigger_type);
            paramCount++;
        }

        query += ` WHERE id = $${paramCount} RETURNING id, name, vehicle_id, ST_AsGeoJSON(boundary)::json AS boundary, trigger_type, created_at, updated_at`;
        params.push(id);

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return error(res, 'Geofence not found', 404);
        }

        return success(res, {
            message: 'Geofence updated successfully',
            geofence: result.rows[0]
        }, 200);

    } catch (err) {
        console.error('Update geofence error:', err);
        return error(res, 'Failed to update geofence: ' + err.message, 500);
    }
}


async function deleteGeofence(req, res) {
    const {id} = req.params;
    try{
        const result = await pool.query('DELETE FROM geofences WHERE id = $1 RETURNING id', [id]);
        if(result.rows.length===0){
            return error(res, 'Geofence not found', 404);
        }
        return success(res, {message: 'Geofence deleted successfully'}, 200);
    }
    catch (err){
        console.error('Delete geofence error:', err);
        return error(res, 'Failed to delete geofence: '+err.message, 500);
    }
}


async function getGeofenceEvents(req, res) {
    const {geofence_id, vehicle_id, limit=50} = req.query;
    try{
        let query = `
            SELECT
                ge.id,
                ge.geofence_id,
                g.name AS geofence_name,
                ge.vehicle_id,
                ge.event_type,
                ST_Y(ge.location) AS latitude,
                ST_X(ge.location) AS longitude,
                ge.speed,
                ge.event_time,
                ge.created_at
            FROM geofence_events ge
            LEFT JOIN geofences g
            ON ge.geofence_id = g.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;
        if(geofence_id){
            query += ` AND ge.geofence_id = $${paramCount}`;
            params.push(geofence_id);
            paramCount++;
        }

        if(vehicle_id){
            query += ` AND ge.vehicle_id = $${paramCount}`;
            params.push(vehicle_id);
            paramCount++;
        }
        query += ` ORDER BY ge.event_time DESC LIMIT $${paramCount}`;
        params.push(Number.parseInt(limit) || 50);
        const result = await pool.query(query, params);
        return success(res, {
            total: result.rows.length,
            events: result.rows
        }, 200);
    }
    catch (err){
        console.error('Get geofence events error:', err);
        return error(res, 'Failed to fetch geofence events: '+err.message, 500);
    }
}

// Was: query cluster_points, then loop result.rows and hand-build
// {type:'Feature', geometry:{...}, properties:{...}} for each one.
// get_frequent_stops_geojson (V13) does exactly that assembly in Postgres.
// The response envelope below is kept identical to the old shape
// (total_clusters / clusters: Feature[]) so geofenceServices.js and
// everything downstream of it needs zero changes.
async function discoverFrequentStops(req, res) {
    const { vehicle_id, days = 7, min_points = 3, radius_km = 0.5 } = req.query;
    try {
        const result = await pool.query(
            `SELECT get_frequent_stops_geojson($1, $2, $3, $4) AS fc`,
            [
                vehicle_id || null,
                Number.parseInt(days, 10),
                Number.parseFloat(radius_km),
                Number.parseInt(min_points, 10)
            ]
        );

        // Safe fallback if rows[0] or fc is null/undefined
        const fc = result.rows[0]?.fc ?? { type: 'FeatureCollection', features: [] };

        return success(res, {
            total_clusters: fc.features.length,
            clusters: fc.features
        }, 200);
    } catch (err) {
        console.error('Discover frequent stops error:', err);
        return error(res, 'Failed to discover frequent stops: ' + err.message, 500);
    }
}

async function discoverFrequentEvents(req, res) {
    const { vehicle_id, event_category, event_detail, days = 7, min_points = 3, radius_km = 0.5 } = req.query;

    try {
        const result = await pool.query(
            `SELECT get_frequent_hotspots_geojson($1, $2, $3, $4, $5, $6) AS fc`,
            [
                event_category || null,
                event_detail || null,
                vehicle_id || null,
                Number.parseInt(days, 10),
                Number.parseFloat(radius_km),
                Number.parseInt(min_points, 10)
            ]
        );

        // Safe fallback if rows[0] or fc is null/undefined
        const fc = result.rows[0]?.fc ?? { type: 'FeatureCollection', features: [] };

        return success(res, {
            total_hotspots: fc.features.length,
            hotspots: fc.features
        }, 200);
    } catch (err) {
        console.error('Discover frequent events error:', err);
        return error(res, 'Failed to discover frequent events: ' + err.message, 500);
    }
}

async function createGeofenceFromCluster(req, res) {
    const { name, vehicle_id, center_lat, center_lng, radius_km = 0.5 } = req.body;

    if (!name || !center_lat || !center_lng) {
        return error(res, 'Name, center_lat, and center_lng are required', 400);
    }

    try {
        const result = await pool.query(
            `INSERT INTO geofences (name, vehicle_id, boundary, trigger_type)
             VALUES ($1, $2, make_circular_geofence_boundary($3, $4, $5), $6)
             RETURNING id, name, vehicle_id, ST_AsGeoJSON(boundary)::json AS boundary, trigger_type, created_at, updated_at`,
            [
                name,
                vehicle_id || null,
                Number.parseFloat(center_lng),
                Number.parseFloat(center_lat),
                Number.parseFloat(radius_km),
                'both'
            ]
        );

        return success(res, {
            message: 'Geofence created successfully from historical cluster data',
            geofence: result.rows[0]
        }, 201);
    } catch (err) {
        console.error('Create geofence from cluster error:', err);
        return error(res, 'Failed to save cluster geofence: ' + err.message, 500);
    }
}

module.exports = {
    createGeofence,
    getGeofences,
    getGeofencesGeoJSON,
    getGeofenceById,
    updateGeofence,
    deleteGeofence,
    getGeofenceEvents,
    discoverFrequentStops,
    discoverFrequentEvents,
    createGeofenceFromCluster
};