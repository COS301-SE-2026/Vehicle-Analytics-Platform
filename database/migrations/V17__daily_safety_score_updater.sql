


-- V17: Daily Safety 





CREATE OR REPLACE FUNCTION update_daily_safety_scores()

RETURNS void AS $$

DECLARE
    v_record RECORD;

    total_penalty INTEGER;

    score INTEGER;

    yesterday DATE := CURRENT_DATE - INTERVAL '1 day';

BEGIN

   

    FOR v_record IN SELECT DISTINCT vehicle_id FROM vehicles
    LOOP




  
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

        WHERE vehicle_id = v_record.vehicle_id

          AND DATE(time) = yesterday;



       

        score := GREATEST(100 - total_penalty, 0);



       
       
        INSERT INTO driver_daily_safety_scores (



            vehicle_id,



            score_date,



            safety_score,

            harsh_brakes,

            harsh_accelerations,

            harsh_cornering,

            crashes,

            total_events,

            classification

        )

        VALUES (

            v_record.vehicle_id,

            yesterday,

            score,

            COALESCE((SELECT COUNT(*) FROM vehicle_events WHERE vehicle_id = v_record.vehicle_id AND DATE(time) = yesterday AND event_detail = 'harsh_braking'), 0),

            COALESCE((SELECT COUNT(*) FROM vehicle_events WHERE vehicle_id = v_record.vehicle_id AND DATE(time) = yesterday AND event_detail = 'harsh_acceleration'), 0),

            COALESCE((SELECT COUNT(*) FROM vehicle_events WHERE vehicle_id = v_record.vehicle_id AND DATE(time) = yesterday AND event_detail = 'harsh_cornering'), 0),

            COALESCE((SELECT COUNT(*) FROM vehicle_events WHERE vehicle_id = v_record.vehicle_id AND DATE(time) = yesterday AND event_category = 'crash_detection'), 0),

            COALESCE((SELECT COUNT(*) FROM vehicle_events WHERE vehicle_id = v_record.vehicle_id AND DATE(time) = yesterday), 0),

            CASE 

                WHEN score >= 80 THEN 'Good'

                WHEN score >= 50 THEN 'Fair'

                ELSE 'Poor'

            END

        )

        ON CONFLICT (vehicle_id, score_date) 

        DO UPDATE SET

            safety_score = EXCLUDED.safety_score,

            harsh_brakes = EXCLUDED.harsh_brakes,

            harsh_accelerations = EXCLUDED.harsh_accelerations,

            harsh_cornering = EXCLUDED.harsh_cornering,

            crashes = EXCLUDED.crashes,

            total_events = EXCLUDED.total_events,

            classification = EXCLUDED.classification,

            updated_at = NOW();

    END LOOP;

END;

$$ LANGUAGE plpgsql;


