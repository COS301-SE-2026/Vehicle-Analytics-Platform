
-- V36: Schedule Safety Score Cron Job



CREATE OR REPLACE PROCEDURE refresh_safety_scores_daily(job_id INT, config JSONB)
LANGUAGE plpgsql AS $$
BEGIN
    PERFORM refresh_daily_safety_scores(CURRENT_DATE - 1);
    PERFORM refresh_daily_safety_scores(CURRENT_DATE);
END;
$$;



DO $$
BEGIN
    PERFORM cron.unschedule('refresh-safety-scores-daily');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;



SELECT cron.schedule(
    'refresh-safety-scores-daily',
    '0 2 * * *',
    $$CALL refresh_safety_scores_daily(0, '{}'::jsonb)$$
);
