


-- V17: Update get_trip_history 




DROP FUNCTION IF EXISTS public.get_trip_history(text, timestamptz, timestamptz, timestamptz, int);

CREATE OR REPLACE FUNCTION public.get_trip_history(

    p_vehicle_id text,
    p_start_date timestamptz DEFAULT NULL,

    p_end_date timestamptz DEFAULT NULL,

    p_before_start_time timestamptz DEFAULT NULL,

    p_limit int DEFAULT 50

)

RETURNS TABLE(

    trip_id bigint,

    vehicle_id text,

    start_time timestamptz,

    end_time timestamptz,

    distance_km numeric,

    duration_seconds int,

    avg_speed_kmh numeric,


    max_speed_kmh numeric,
    status text,

    safety_score int

)



LANGUAGE plpgsql STABLE

AS $$

BEGIN

    RETURN QUERY

    SELECT

        t.trip_id,

        t.vehicle_id,

        t.start_time,

        t.end_time,

        t.distance_km,

        t.duration_seconds,

        t.avg_speed_kmh,

        t.max_speed_kmh,

        t.status,

        t.safety_score

    FROM trips t

    WHERE t.vehicle_id = p_vehicle_id

      AND (p_start_date IS NULL OR t.start_time >= p_start_date)

      AND (p_end_date IS NULL OR t.end_time IS NULL OR t.end_time <= p_end_date)

      AND (p_before_start_time IS NULL OR t.start_time < p_before_start_time)

    ORDER BY t.start_time DESC


    LIMIT p_limit;
END;


$$;

