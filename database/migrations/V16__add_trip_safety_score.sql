

-- V16: Add safety_score column 




ALTER TABLE trips ADD COLUMN IF NOT EXISTS safety_score INTEGER DEFAULT NULL;





CREATE OR REPLACE FUNCTION calculate_trip_safety_score()




RETURNS TRIGGER AS $$



DECLARE



    total_penalty INTEGER := 0;



    score INTEGER := 100;



BEGIN





    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN



        

        SELECT COALESCE(SUM(

            CASE 

                WHEN event_detail = 'harsh_braking' THEN 10




                WHEN event_detail = 'harsh_acceleration' THEN 5

                WHEN event_detail = 'harsh_cornering' THEN 3

                WHEN event_category = 'crash_detection' THEN 50

                ELSE 0

            END

        ), 0) INTO total_penalty



        FROM vehicle_events



        WHERE vehicle_id = NEW.vehicle_id



          AND time BETWEEN NEW.start_time AND NEW.end_time;



        

        score := GREATEST(100 - total_penalty, 0);




        NEW.safety_score := score;



    END IF;







    RETURN NEW;



END;

$$ LANGUAGE plpgsql;







DROP TRIGGER IF EXISTS trigger_calculate_trip_safety_score ON trips;



CREATE TRIGGER trigger_calculate_trip_safety_score



BEFORE UPDATE ON trips



FOR EACH ROW



EXECUTE FUNCTION calculate_trip_safety_score();







UPDATE trips t



SET safety_score = (



    SELECT GREATEST(100 - COALESCE(SUM(



        CASE 



            WHEN ve.event_detail = 'harsh_braking' THEN 10



            WHEN ve.event_detail = 'harsh_acceleration' THEN 5



            WHEN ve.event_detail = 'harsh_cornering' THEN 3

            WHEN ve.event_category = 'crash_detection' THEN 50


            ELSE 0


        END


    ), 0), 0)



    FROM vehicle_events ve



    WHERE ve.vehicle_id = t.vehicle_id



      AND ve.time BETWEEN t.start_time AND t.end_time



)

WHERE t.status = 'completed' AND t.safety_score IS NULL;








CREATE INDEX IF NOT EXISTS idx_trips_safety_score ON trips (safety_score);



CREATE INDEX IF NOT EXISTS idx_trips_vehicle_safety ON trips (vehicle_id, safety_score);



