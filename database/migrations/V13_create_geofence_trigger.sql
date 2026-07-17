--Triggers for geofence event on clean telemetry table

CREATE OR REPLACE FUNCTION process_geofence_events()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    current_location GEOMETRY(POINT, 4326);
    geofence_record RECORD;
    previously_inside BOOLEAN;
    currently_inside BOOLEAN;
BEGIN
    --Ignore records with null lat/lng
    IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
        RETURN NEW;
    END IF;

    --Construct geometry
    current_location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    
    FOR geofence_record IN
        SELECT id, boundary, trigger_type
        FROM geofences
        WHERE (vehicle_id IS NULL OR vehicle_id = NEW.vehicle_id)
          AND boundary && current_location 
          AND ST_Intersects(boundary, current_location) 
    LOOP 
        --Determine current intersection
        currently_inside := ST_Contains(geofence_record.boundary, current_location);

        --FETCH the old state BEFORE updating it
        SELECT is_inside INTO previously_inside
        FROM geofence_state
        WHERE geofence_id = geofence_record.id AND vehicle_id = NEW.vehicle_id;
        
        IF previously_inside IS NULL THEN
            previously_inside := FALSE; -- Default for first-time tracking
        END IF;

        --Check for Entry Event
        IF NOT previously_inside AND currently_inside THEN
            IF geofence_record.trigger_type IN ('entry', 'both') THEN
                INSERT INTO geofence_events (geofence_id, vehicle_id, event_type, location, speed)
                VALUES (geofence_record.id, NEW.vehicle_id, 'entry', current_location, NEW.speed);
            END IF;

        --Check for Exit Event
        ELSIF previously_inside AND NOT currently_inside THEN 
            IF geofence_record.trigger_type IN ('exit', 'both') THEN
                INSERT INTO geofence_events (geofence_id, vehicle_id, event_type, location, speed)
                VALUES (geofence_record.id, NEW.vehicle_id, 'exit', current_location, NEW.speed);
            END IF;
        END IF;

        --UPSERT the state database with the new status (Only do this ONCE at the end)
        INSERT INTO geofence_state (geofence_id, vehicle_id, is_inside, last_updated)
        VALUES (geofence_record.id, NEW.vehicle_id, currently_inside, NOW())
        ON CONFLICT (geofence_id, vehicle_id) 
        DO UPDATE SET 
            is_inside = EXCLUDED.is_inside,
            last_updated = EXCLUDED.last_updated;

    END LOOP;

    RETURN NEW;
END;
$$;

CREATE TRIGGER geofence_event_trigger
AFTER INSERT ON clean_telemetry
FOR EACH ROW
EXECUTE FUNCTION process_geofence_events();
