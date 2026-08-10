

-- V19: fuel efficiency tables



-- Table: trip_fuel_efficiency

CREATE TABLE IF NOT EXISTS trip_fuel_efficiency (

    id SERIAL PRIMARY KEY,

    trip_id INTEGER NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,

    vehicle_id TEXT NOT NULL REFERENCES vehicles(vehicle_id),



    trip_date DATE NOT NULL,

    total_distance_km NUMERIC(10,2),

    avg_speed_kmh NUMERIC(6,2),

    estimated_fuel_consumed_liters NUMERIC(10,2),

    fuel_efficiency_km_per_liter NUMERIC(6,2),

    fuel_efficiency_l_per_100km NUMERIC(6,2),

    road_breakdown JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(trip_id)

);






-- Indexes


CREATE INDEX IF NOT EXISTS idx_trip_fuel_vehicle ON trip_fuel_efficiency(vehicle_id);


CREATE INDEX IF NOT EXISTS idx_trip_fuel_vehicle_date ON trip_fuel_efficiency(vehicle_id, trip_date DESC);


CREATE INDEX IF NOT EXISTS idx_trip_fuel_trip ON trip_fuel_efficiency(trip_id);



-- Materialized view

CREATE MATERIALIZED VIEW IF NOT EXISTS fleet_daily_fuel_summary AS

SELECT

    DATE(trip_date) AS date,

    vehicle_id,

    COUNT(*) AS trip_count,

    SUM(total_distance_km) AS total_distance_km,

    SUM(estimated_fuel_consumed_liters) AS total_fuel_liters,

    AVG(fuel_efficiency_km_per_liter) AS avg_efficiency_km_per_l

FROM trip_fuel_efficiency

GROUP BY DATE(trip_date), vehicle_id;



-- Indexes

CREATE INDEX IF NOT EXISTS idx_fleet_daily_fuel_date ON fleet_daily_fuel_summary(date DESC);

CREATE INDEX IF NOT EXISTS idx_fleet_daily_fuel_vehicle ON fleet_daily_fuel_summary(vehicle_id);



-- calculate fuel efficiency when trip completes

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




    -- Only calculate for completed trips

    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN

        

        -- Get trip data from clean_telemetry

        SELECT 

            COALESCE(SUM(distance), 0),

            COALESCE(AVG(avg_speed), 0)

        INTO total_distance, avg_speed

        FROM (

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

        ) segments


        WHERE distance > 0;





        -- skip if no dist data

        IF total_distance <= 0 THEN

            RETURN NEW;

        END IF;



        -- calc fuel using road types

        SELECT 

            SUM(segment_fuel)::NUMERIC,

            jsonb_object_agg(road_class, total_road_distance)::JSONB

        INTO fuel_consumed, road_breakdown

        FROM (

            SELECT 

                road.road_class,

                SUM(distance) AS total_road_distance,

                SUM(

                    (distance / 100) * 

                    CASE 

                        WHEN road.road_class = 'motorway' THEN 6.0

                        WHEN road.road_class = 'motorway_link' THEN 6.5

                        WHEN road.road_class = 'trunk' THEN 6.5

                        WHEN road.road_class = 'trunk_link' THEN 7.0

                        WHEN road.road_class = 'primary' THEN 7.0

                        WHEN road.road_class = 'primary_link' THEN 7.5

                        WHEN road.road_class = 'secondary' THEN 8.5

                        WHEN road.road_class = 'secondary_link' THEN 8.5

                        WHEN road.road_class = 'tertiary' THEN 9.0

                        WHEN road.road_class = 'tertiary_link' THEN 9.5

                        WHEN road.road_class = 'residential' THEN 10.0

                        WHEN road.road_class = 'living_street' THEN 11.0

                        WHEN road.road_class = 'service' THEN 9.0

                        WHEN road.road_class = 'unclassified' THEN 8.5


                        ELSE 8.5


                    END *

                    CASE 


                        WHEN avg_speed < 20 THEN 1.1

                        WHEN avg_speed < 40 THEN 1.0

                        WHEN avg_speed < 60 THEN 0.9

                        WHEN avg_speed < 80 THEN 0.85

                        WHEN avg_speed < 100 THEN 0.9

                        ELSE 1.0

                    END

                ) AS segment_fuel

            FROM (

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

            ) segments

            CROSS JOIN LATERAL (

                SELECT road_class

                FROM roads
                WHERE ST_DWithin(

                    geom,

                    ST_SetSRID(ST_MakePoint(segments.longitude, segments.latitude), 4326),

                    0.001

                )

                ORDER BY geom <-> ST_SetSRID(ST_MakePoint(segments.longitude, segments.latitude), 4326)

                LIMIT 1

            ) road

            WHERE distance > 0

            GROUP BY road.road_class

        ) road_fuel;



        -- no fuel data, use speed-based est

        IF fuel_consumed IS NULL OR fuel_consumed <= 0 THEN


            CASE 

                WHEN avg_speed < 20 THEN fuel_rate := 14.0;

                WHEN avg_speed < 40 THEN fuel_rate := 11.0;

                WHEN avg_speed < 60 THEN fuel_rate := 8.5;

                WHEN avg_speed < 80 THEN fuel_rate := 7.0;

                WHEN avg_speed < 100 THEN fuel_rate := 7.5;

                ELSE fuel_rate := 9.0;

            END CASE;

            fuel_consumed := (total_distance / 100) * fuel_rate;

        END IF;




        -- calc efficiency

        IF fuel_consumed > 0 THEN

            efficiency := total_distance / fuel_consumed;

        END IF;



        -- Insert into trip_fuel_efficiency

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



-- Trigger to calc fuel efficiency when trip completes

DROP TRIGGER IF EXISTS trigger_calculate_trip_fuel_efficiency ON trips;

CREATE TRIGGER trigger_calculate_trip_fuel_efficiency

AFTER UPDATE ON trips

FOR EACH ROW

WHEN (NEW.status = 'completed' AND OLD.status = 'open')

EXECUTE FUNCTION calculate_trip_fuel_efficiency();



GRANT SELECT ON trip_fuel_efficiency TO fleet_admin;

GRANT SELECT ON fleet_daily_fuel_summary TO fleet_admin;


