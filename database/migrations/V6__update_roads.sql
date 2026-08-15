--update the roads table to include the geometry column and set the SRID to 4326
-- Add numeric speed limit column
ALTER TABLE roads
ADD COLUMN IF NOT EXISTS maxspeed_kmh INTEGER;

-- Populate numeric speed limits
UPDATE roads
SET maxspeed_kmh =
CASE

    -- Plain numeric values
    WHEN maxspeed ~ '^[0-9]+$'
        THEN maxspeed::integer

    -- Values like "10 kmph"
    WHEN maxspeed ~ '^[0-9]+ *kmph$'
        THEN regexp_replace(maxspeed, '[^0-9]', '', 'g')::integer

    -- Values like "35 mph"
    WHEN maxspeed ~ '^[0-9]+ *mph$'
        THEN ROUND(
            regexp_replace(maxspeed, '[^0-9]', '', 'g')::numeric * 1.60934
        )::integer

    -- Values like "50;60"
    WHEN maxspeed ~ '^[0-9]+;[0-9]+$'
        THEN split_part(maxspeed, ';', 1)::integer

    ELSE NULL

END;

-- Performance indexes
CREATE INDEX IF NOT EXISTS roads_maxspeed_idx
ON roads(maxspeed_kmh);

CREATE INDEX IF NOT EXISTS roads_class_idx
ON roads(road_class);

ANALYZE roads;