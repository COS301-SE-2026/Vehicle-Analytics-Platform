CREATE OR REPLACE FUNCTION data_now()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
AS $function$
BEGIN
    RETURN (
        SELECT GREATEST(MAX(time), NOW())
        FROM clean_telemetry
    );
END;
$function$;

CREATE OR REPLACE FUNCTION data_today()
RETURNS DATE
LANGUAGE sql
STABLE
AS $function$ SELECT (data_now() AT TIME ZONE 'UTC')::DATE; $function$;