-- V42: Schedule Safety Score Cron Job
--
-- pg_cron is available in production (verified: version 1.6) but NOT in
-- `timescale/timescaledb-ha:pg16`, the image used in all CI workflows
-- (ci_pipeline, e2e, full_integration). This migration therefore schedules
-- the job only where pg_cron exists, and no-ops elsewhere so CI / local dev
-- migrations still succeed.

CREATE OR REPLACE PROCEDURE refresh_safety_scores_daily(job_id INT, config JSONB)
LANGUAGE plpgsql AS $$
BEGIN
    PERFORM refresh_daily_safety_scores(CURRENT_DATE - 1);
    PERFORM refresh_daily_safety_scores(CURRENT_DATE);
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'
    ) THEN
        CREATE EXTENSION IF NOT EXISTS pg_cron;

        -- Idempotent: unschedule if it already exists, then schedule fresh
        BEGIN
            PERFORM cron.unschedule('refresh-safety-scores-daily');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        PERFORM cron.schedule(
            'refresh-safety-scores-daily',
            '0 2 * * *',
            $cron$CALL refresh_safety_scores_daily(0, '{}'::jsonb)$cron$
        );

        RAISE NOTICE 'Scheduled refresh-safety-scores-daily via pg_cron';
    ELSE
        RAISE NOTICE 'pg_cron not available in this environment; skipping cron schedule';
    END IF;
END
$$;
