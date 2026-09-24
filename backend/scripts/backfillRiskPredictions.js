

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number.parseInt(process.env.DB_PORT || '6432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false,
  max: 2,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
});

const DAYS_BACK = Number.parseInt(process.argv[2], 10) || 30;

async function queryWithRetry(sql, params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await pool.query(sql, params);
    } catch (err) {
      const transient = /terminated|ECONNRESET|timeout/i.test(err.message);
      if (!transient || i === retries - 1) throw err;
      console.warn(`[BACKFILL] Retry ${i + 1}/${retries} after: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

function scoreFeatures(model, f) {
  const z = (v, mean, std) => (Number(v) - Number(mean)) / (Number(std) || 1);
  let logit = Number(model.intercept);
  logit += Number(model.w_safety)   * z(f.safety_feature,   model.mean_safety,   model.std_safety);
  logit += Number(model.w_harsh)    * z(f.harsh_feature,    model.mean_harsh,    model.std_harsh);
  logit += Number(model.w_speeding) * z(f.speeding_feature, model.mean_speeding, model.std_speeding);
  const p = 1 / (1 + Math.exp(-logit));
  return Math.round(p * 10000) / 100;
}

function classifyTier(score) {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

function buildTopFactors(model, f) {
  const z = (v, mean, std) => (Number(v) - Number(mean)) / (Number(std) || 1);
  const contributions = [
    { name: 'Low prior safety score', weight: Math.abs(Number(model.w_safety)   * z(f.safety_feature,   model.mean_safety,   model.std_safety)),   value: Number(f.safety_feature)   },
    { name: 'Frequent harsh events',  weight: Math.abs(Number(model.w_harsh)    * z(f.harsh_feature,    model.mean_harsh,    model.std_harsh)),    value: Number(f.harsh_feature)    },
    { name: 'Frequent speeding',      weight: Math.abs(Number(model.w_speeding) * z(f.speeding_feature, model.mean_speeding, model.std_speeding)), value: Number(f.speeding_feature) },
    { name: 'High weekly distance',   weight: Math.abs(Number(f.distance_feature) * 0.01),                                                        value: Number(f.distance_feature) },
    { name: 'Long trip recency',      weight: Math.abs(Number(f.recency_feature)  * 0.01),                                                        value: Number(f.recency_feature)  },
  ];
  return contributions
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((c) => ({
      name: c.name,
      weight: Math.round(c.weight * 100) / 100,
      value: Math.round(c.value * 100) / 100,
    }));
}

(async () => {
  try {
    console.log('[BACKFILL] Loading model...');
    const { rows: models } = await queryWithRetry(
      'SELECT * FROM risk_model_weights ORDER BY trained_at DESC LIMIT 1'
    );
    if (!models.length) {
      console.error('[BACKFILL] No trained model. Run trainRiskModel.js first.');
      process.exit(1);
    }
    const model = models[0];

    console.log('[BACKFILL] Loading vehicles...');
    const { rows: vehicles } = await queryWithRetry('SELECT vehicle_id FROM vehicles');

    console.log(`[BACKFILL] Backfilling ${DAYS_BACK} days for ${vehicles.length} vehicles...`);

    let totalWritten = 0;

    for (const v of vehicles) {
      const { rows: featureRows } = await queryWithRetry(
        `
        WITH days AS (
          SELECT generate_series(
            (CURRENT_DATE - INTERVAL '${DAYS_BACK} days')::date,
            CURRENT_DATE::date,
            '1 day'::interval
          )::date AS d
        )
        SELECT
          d.d AS prediction_date,
          COALESCE((
            SELECT AVG(safety_score)
            FROM driver_daily_safety_scores s
            WHERE s.vehicle_id = $1
              AND s.score_date BETWEEN d.d - 29 AND d.d
          ), 100)::numeric AS safety_feature,
          COALESCE((
            SELECT SUM(harsh_brakes + harsh_accelerations + harsh_cornering)::numeric
                   / NULLIF(COUNT(DISTINCT t.trip_id), 0)
            FROM driver_daily_safety_scores s
            LEFT JOIN trips t
              ON t.vehicle_id = s.vehicle_id
             AND t.start_time::date = s.score_date
             AND t.status = 'completed'
            WHERE s.vehicle_id = $1
              AND s.score_date BETWEEN d.d - 29 AND d.d
          ), 0)::numeric AS harsh_feature,
          COALESCE((
            SELECT AVG(CASE WHEN max_speed_kmh > 100 THEN 1 ELSE 0 END)
            FROM trips t
            WHERE t.vehicle_id = $1
              AND t.status = 'completed'
              AND t.start_time::date BETWEEN d.d - 29 AND d.d
          ), 0)::numeric AS speeding_feature,
          COALESCE((
            SELECT AVG(CASE WHEN EXTRACT(DOW FROM start_time) IN (0,6) THEN 1 ELSE 0 END)
            FROM trips t
            WHERE t.vehicle_id = $1
              AND t.status = 'completed'
              AND t.start_time::date BETWEEN d.d - 29 AND d.d
          ), 0)::numeric AS weekend_feature,
          LEAST(COALESCE((
            SELECT SUM(distance_km)
            FROM trips t
            WHERE t.vehicle_id = $1
              AND t.status = 'completed'
              AND t.start_time::date BETWEEN d.d - 29 AND d.d
          ), 0), 5000)::numeric AS distance_feature,
          COALESCE((
            SELECT (d.d - MAX(t.end_time)::date)::numeric
            FROM trips t
            WHERE t.vehicle_id = $1
              AND t.status = 'completed'
              AND t.end_time::date <= d.d
          ), 999)::numeric AS recency_feature
        FROM days d
        ORDER BY d.d
        `,
        [v.vehicle_id]
      );

      for (const f of featureRows) {
        const score = scoreFeatures(model, f);
        const tier = classifyTier(score);
        const topFactors = buildTopFactors(model, f);

        await queryWithRetry(
          `
          INSERT INTO vehicle_risk_predictions (
            vehicle_id, prediction_date, risk_score, risk_tier,
            feature_safety, feature_harsh, feature_crashes,
            feature_speeding, feature_weekend, top_factors, model_version
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, 0,
            $7, $8, $9, $10
          )
          ON CONFLICT (vehicle_id, prediction_date) DO UPDATE SET
            risk_score       = EXCLUDED.risk_score,
            risk_tier        = EXCLUDED.risk_tier,
            feature_safety   = EXCLUDED.feature_safety,
            feature_harsh    = EXCLUDED.feature_harsh,
            feature_speeding = EXCLUDED.feature_speeding,
            feature_weekend  = EXCLUDED.feature_weekend,
            top_factors      = EXCLUDED.top_factors,
            model_version    = EXCLUDED.model_version
          `,
          [
            v.vehicle_id,
            f.prediction_date,
            score,
            tier,
            f.safety_feature,
            f.harsh_feature,
            f.speeding_feature,
            f.weekend_feature,
            JSON.stringify(topFactors),
            model.id,
          ]
        );

        totalWritten++;
      }

      console.log(`[BACKFILL] Vehicle ${v.vehicle_id} done. Total: ${totalWritten} rows`);
    }

    console.log(`[BACKFILL] Done. ${totalWritten} prediction rows upserted.`);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('[BACKFILL] Fatal:', err);
    process.exit(1);
  }
})();
