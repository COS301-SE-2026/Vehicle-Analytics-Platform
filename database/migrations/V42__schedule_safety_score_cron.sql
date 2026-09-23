-- V42: Schedule Safety Score Cron Job
--
-- pg_cron is only usable when it has been pre-loaded via
-- shared_preload_libraries AND a `cron.database_name` has been configured.
-- CI images (`timescale/timescaledb-ha:pg16`) ship the pg_cron *files* but
-- do NOT preload it, so `CREATE EXTENSION pg_cron` fails with
-- "unrecognized configuration parameter cron.database_name".
--
-- We therefore only run the scheduling logic if pg_cron is ALREADY
-- installed in this database (which is the case in production). On CI and
-- local dev, this migration becomes a no-op.

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
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
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
        RAISE NOTICE 'pg_cron not installed in this database; skipping cron schedule';
    END IF;
END
$$;
