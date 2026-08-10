

-- V20: Fix fuel efficiency trigger



-- Drop existing trigger if exists

DROP TRIGGER IF EXISTS trigger_calculate_trip_fuel_efficiency ON trips;



-- Recreate functions (ensure latest version)

CREATE OR REPLACE FUNCTION get_fuel_rate(road_class TEXT)
RETURNS NUMERIC AS $$

BEGIN
    RETURN CASE road_class

        WHEN 'motorway' THEN 6.0

        WHEN 'motorway_link' THEN 6.5

        WHEN 'trunk' THEN 6.5

        WHEN 'trunk_link' THEN 7.0

        WHEN 'primary' THEN 7.0

        WHEN 'primary_link' THEN 7.5

        WHEN 'secondary' THEN 8.5

        WHEN 'secondary_link' THEN 8.5

        WHEN 'tertiary' THEN 9.0

        WHEN 'tertiary_link' THEN 9.5

        WHEN 'residential' THEN 10.0

        WHEN 'living_street' THEN 11.0

        WHEN 'service' THEN 9.0

        WHEN 'unclassified' THEN 8.5

        ELSE 8.5

    END;

END;

$$ LANGUAGE plpgsql IMMUTABLE;



CREATE OR REPLACE FUNCTION get_speed_factor(avg_speed NUMERIC)

RETURNS NUMERIC AS $$

BEGIN

    RETURN CASE

        WHEN avg_speed < 20 THEN 1.1

        WHEN avg_speed < 40 THEN 1.0

        WHEN avg_speed < 60 THEN 0.9

        WHEN avg_speed < 80 THEN 0.85

        WHEN avg_speed < 100 THEN 0.9

        ELSE 1.0

    END;

END;

$$ LANGUAGE plpgsql IMMUTABLE;



CREATE OR REPLACE FUNCTION calculate_trip_fuel_efficiency()

RETURNS TRIGGER AS $$

DECLARE

    total_distance NUMERIC := 0;

    avg_speed NUMERIC := 0;

    fuel_consumed NUMERIC := 0;

    efficiency NUMERIC := 0;

    road_breakdown JSONB := '{}'::JSONB;

    fuel_rate NUMERIC := 8.5;

BEGIN

    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN

        

        WITH trip_segments AS (

            SELECT 

                ct.latitude,

                ct.longitude,

                ct.speed,

                ST_Distance(

                    ST_SetSRID(ST_MakePoint(ct.longitude, ct.latitude), 4326),

                    LAG(ST_SetSRID(ST_MakePoint(ct.longitude, ct.latitude), 4326)) OVER (ORDER BY ct.time)

                ) * 111.32 AS distance,

                (ct.speed + LAG(ct.speed) OVER (ORDER BY ct.time)) / 2 AS avg_speed

            FROM clean_telemetry ct

            WHERE ct.vehicle_id = NEW.vehicle_id

              AND ct.time BETWEEN NEW.start_time AND NEW.end_time

        )

        SELECT 

            COALESCE(SUM(distance), 0),

            COALESCE(AVG(avg_speed), 0)

        INTO total_distance, avg_speed

        FROM trip_segments

        WHERE distance > 0;



        IF total_distance <= 0 THEN

            RETURN NEW;

        END IF;



        WITH trip_segments AS (

            SELECT 

                ct.latitude,

                ct.longitude,

                ct.speed,

                ST_Distance(

                    ST_SetSRID(ST_MakePoint(ct.longitude, ct.latitude), 4326),

                    LAG(ST_SetSRID(ST_MakePoint(ct.longitude, ct.latitude), 4326)) OVER (ORDER BY ct.time)

                ) * 111.32 AS distance,

                (ct.speed + LAG(ct.speed) OVER (ORDER BY ct.time)) / 2 AS avg_speed

            FROM clean_telemetry ct

            WHERE ct.vehicle_id = NEW.vehicle_id

              AND ct.time BETWEEN NEW.start_time AND NEW.end_time

        ),

        road_matched AS (

            SELECT 

                s.distance,

                s.avg_speed,

                r.road_class

            FROM trip_segments s

            CROSS JOIN LATERAL (

                SELECT road_class

                FROM roads

                WHERE ST_DWithin(

                    geom,

                    ST_SetSRID(ST_MakePoint(s.longitude, s.latitude), 4326),

                    0.001

                )

                ORDER BY geom <-> ST_SetSRID(ST_MakePoint(s.longitude, s.latitude), 4326)

                LIMIT 1

            ) r

            WHERE s.distance > 0

        )

        SELECT 

            SUM(segment_fuel)::NUMERIC,

            jsonb_object_agg(road_class, total_road_distance)::JSONB

        INTO fuel_consumed, road_breakdown

        FROM (

            SELECT 

                road_class,

                SUM(distance) AS total_road_distance,

                SUM(

                    (distance / 100) * 

                    get_fuel_rate(road_class) *

                    get_speed_factor(avg_speed)

                ) AS segment_fuel

            FROM road_matched

            GROUP BY road_class

        ) road_fuel;



        IF fuel_consumed IS NULL OR fuel_consumed <= 0 THEN

            fuel_rate := get_speed_factor(avg_speed) * 8.5;

            fuel_consumed := (total_distance / 100) * fuel_rate;

        END IF;



        IF fuel_consumed > 0 THEN

            efficiency := total_distance / fuel_consumed;

        END IF;



        INSERT INTO trip_fuel_efficiency (

            trip_id,

            vehicle_id,

            trip_date,

            total_distance_km,

            avg_speed_kmh,

            estimated_fuel_consumed_liters,

            fuel_efficiency_km_per_liter,

            fuel_efficiency_l_per_100km,

            road_breakdown

        ) VALUES (

            NEW.trip_id,

            NEW.vehicle_id,

            DATE(NEW.start_time),

            total_distance,

            avg_speed,

            fuel_consumed,

            efficiency,

            CASE WHEN efficiency > 0 THEN 100 / efficiency ELSE 0 END,

            road_breakdown

        ) ON CONFLICT (trip_id) DO UPDATE SET

            total_distance_km = EXCLUDED.total_distance_km,

            avg_speed_kmh = EXCLUDED.avg_speed_kmh,

            estimated_fuel_consumed_liters = EXCLUDED.estimated_fuel_consumed_liters,

            fuel_efficiency_km_per_liter = EXCLUDED.fuel_efficiency_km_per_liter,

            fuel_efficiency_l_per_100km = EXCLUDED.fuel_efficiency_l_per_100km,

            road_breakdown = EXCLUDED.road_breakdown,

            updated_at = NOW();



    END IF;



    RETURN NEW;

EXCEPTION WHEN OTHERS THEN

    RAISE WARNING 'Error calculating fuel efficiency for trip %: %', NEW.trip_id, SQLERRM;

    RETURN NEW;

END;

$$ LANGUAGE plpgsql;



-- Recreate trigger

CREATE TRIGGER trigger_calculate_trip_fuel_efficiency

AFTER UPDATE ON trips

FOR EACH ROW

WHEN (NEW.status = 'completed' AND OLD.status = 'open')

EXECUTE FUNCTION calculate_trip_fuel_efficiency();


