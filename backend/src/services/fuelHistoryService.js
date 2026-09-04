const { Pool } = require('pg');

class FuelHistoryService {
    constructor() {
        this.pool = new Pool({
            host: process.env.DB_HOST,
            port: Number.parseInt(process.env.DB_PORT || '6432'),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });
    }

    async calculateAndStoreDailyHistory(vehicleId, date) {
        try {
            const query = `
                INSERT INTO fuel_efficiency_history (vehicle_id, period_start, period_end, period_type, total_distance, total_fuel, avg_efficiency, road_class_breakdown, trip_count)
                SELECT 
                    tfe.vehicle_id,
                    DATE($1) as period_start,
                    DATE($1) + INTERVAL '1 day' as period_end,
                    'day' as period_type,
                    SUM(tfe.total_distance_km) as total_distance,
                    SUM(tfe.estimated_fuel_consumed_liters) as total_fuel,
                    AVG(tfe.fuel_efficiency_km_per_liter) as avg_efficiency,
                    jsonb_build_object(
                        'motorway', COALESCE(SUM((tfe.road_breakdown->>'motorway')::numeric), 0),
                        'primary', COALESCE(SUM((tfe.road_breakdown->>'primary')::numeric), 0),
                        'residential', COALESCE(SUM((tfe.road_breakdown->>'residential')::numeric), 0),
                        'other', COALESCE(SUM((tfe.road_breakdown->>'other')::numeric), 0)
                    ) as road_class_breakdown,
                    COUNT(tfe.trip_id) as trip_count
                FROM trip_fuel_efficiency tfe
                WHERE tfe.vehicle_id = $2
                  AND tfe.trip_date = DATE($1)
                  AND tfe.total_distance_km > 0
                GROUP BY tfe.vehicle_id
            `;
            await this.pool.query(query, [date, vehicleId]);
        } catch (err) {
            console.error('Error calculating daily history:', err);
            throw err;
        }
    }

    async getVehicleFuelHistory(vehicleId, period, limit) {
        try {
            const periodDays = { day: 1, week: 7, month: 30 };
            const days = periodDays[period] || 7;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - (days * (limit || 10)));

            const query = `
                SELECT 
                    period_start,
                    period_end,
                    total_distance,
                    total_fuel,
                    avg_efficiency,
                    road_class_breakdown,
                    trip_count,
                    ROUND(100.0 * (avg_efficiency - LAG(avg_efficiency) OVER (ORDER BY period_start)) / NULLIF(LAG(avg_efficiency) OVER (ORDER BY period_start), 0), 1) as efficiency_change
                FROM fuel_efficiency_history
                WHERE vehicle_id = $1
                  AND period_type = $2
                  AND period_start >= $3
                ORDER BY period_start DESC
                LIMIT $4
            `;

            const result = await this.pool.query(query, [vehicleId, period, startDate, limit || 10]);
            
            if (!result?.rows) return [];

            if (result.rows.length === 0 && period !== 'day') {
                const fallbackQuery = `
                    SELECT 
                        period_start,
                        period_end,
                        total_distance,
                        total_fuel,
                        avg_efficiency,
                        road_class_breakdown,
                        trip_count,
                        ROUND(100.0 * (avg_efficiency - LAG(avg_efficiency) OVER (ORDER BY period_start)) / NULLIF(LAG(avg_efficiency) OVER (ORDER BY period_start), 0), 1) as efficiency_change
                    FROM fuel_efficiency_history
                    WHERE vehicle_id = $1
                      AND period_type = 'day'
                      AND period_start >= $2
                    ORDER BY period_start DESC
                    LIMIT $3
                `;
                const fallbackResult = await this.pool.query(fallbackQuery, [vehicleId, startDate, limit || 10]);
                return fallbackResult.rows || [];
            }

            return result.rows || [];
        } catch (err) {
            console.error('Error fetching vehicle fuel history:', err);
            return [];
        }
    }

    async getFleetFuelHistory(period, limit) {
        try {
            const periodDays = { day: 1, week: 7, month: 30 };
            const days = periodDays[period] || 7;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - (days * (limit || 10)));

            const query = `
                SELECT 
                    period_start,
                    SUM(total_distance) as total_distance,
                    SUM(total_fuel) as total_fuel,
                    CASE WHEN SUM(total_distance) > 0 THEN SUM(total_distance) / NULLIF(SUM(total_fuel), 0) ELSE 0 END as avg_efficiency,
                    COUNT(DISTINCT vehicle_id) as vehicles_tracked
                FROM fuel_efficiency_history
                WHERE period_type = $1
                  AND period_start >= $2
                GROUP BY period_start
                ORDER BY period_start DESC
                LIMIT $3
            `;

            const result = await this.pool.query(query, [period, startDate, limit || 10]);
            return result.rows || [];
        } catch (err) {
            console.error('Error fetching fleet fuel history:', err);
            return [];
        }
    }

    async getVehicleFuelTrend(vehicleId, days) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - (days || 30));

            const query = `
                SELECT 
                    period_start,
                    avg_efficiency,
                    total_distance,
                    total_fuel,
                    trip_count
                FROM fuel_efficiency_history
                WHERE vehicle_id = $1
                  AND period_type = 'day'
                  AND period_start >= $2
                ORDER BY period_start ASC
            `;

            const result = await this.pool.query(query, [vehicleId, startDate]);
            return result.rows || [];
        } catch (err) {
            console.error('Error fetching vehicle fuel trend:', err);
            return [];
        }
    }
}

module.exports = FuelHistoryService;
