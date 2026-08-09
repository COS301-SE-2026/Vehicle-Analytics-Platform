-- Live fleet positions, ready for Mapbox GL JS's source.setData()

CREATE OR REPLACE FUNCTION get_fleet_positions_geojson(
    p_min_lng DOUBLE PRECISION DEFAULT NULL,
    p_min_lat DOUBLE PRECISION DEFAULT NULL,
    p_max_lng DOUBLE PRECISION DEFAULT NULL,
    p_max_lat DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSON
LANGUAGE sql STABLE AS $$
    SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
            json_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(cvp.location)::json,
                'properties', json_build_object(
                    'vehicle_id', cvp.vehicle_id,
                    'device_id', cvp.device_id,
                    'speed', cvp.speed,
                    'ignition', cvp.ignition,
                    'movement', cvp.movement,
                    'last_update', cvp.last_update
                )
            )
        ), '[]'::json)
    )
    FROM current_vehicle_position cvp
    WHERE cvp.location IS NOT NULL
      AND (p_min_lng IS NULL
           OR cvp.location && ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326));
$$;
