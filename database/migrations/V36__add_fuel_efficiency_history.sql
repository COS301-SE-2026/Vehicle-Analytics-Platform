CREATE TABLE IF NOT EXISTS fuel_efficiency_history (

    id SERIAL PRIMARY KEY,

    vehicle_id VARCHAR(50) NOT NULL,

    period_start DATE NOT NULL,

    period_end DATE NOT NULL,


    period_type VARCHAR(10) NOT NULL,

    total_distance NUMERIC(10,2),

    total_fuel NUMERIC(10,2),

    avg_efficiency NUMERIC(8,2),
    

    road_class_breakdown JSONB,


    trip_count INTEGER,

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(vehicle_id, period_start, period_type)

);



CREATE INDEX idx_fuel_history_vehicle ON fuel_efficiency_history(vehicle_id);



CREATE INDEX idx_fuel_history_period ON fuel_efficiency_history(period_start, period_end);

