-- Migration: Current Vehicle Position View
-- Description: Creates a view to represent the current position of vehicles based on the latest data from clean_telemetry. This view selects the most recent telemetry data for each vehicle within the last 2 hours, providing a quick reference for the current location and speed of vehicles.

CREATE OR REPLACE VIEW current_vehicle_position AS
SELECT DISTINCT ON (vehicle_id)
    vehicle_id AS id,
    device_id,
    latitude,
    longitude,
    speed,
    time AS last_update
From clean_telemetry
Order BY vehicle_id, time DESC;