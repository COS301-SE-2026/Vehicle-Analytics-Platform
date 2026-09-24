

const { Pool } = require('pg');

class RiskPredictionService {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: Number.parseInt(process.env.DB_PORT || '6432', 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: false,
    });
  }

  async getModel() {
    const { rows } = await this.pool.query(
      `SELECT * FROM risk_model_weights ORDER BY trained_at DESC LIMIT 1`
    );
    return rows[0] || null;
  }

  scoreFeatures(model, f) {

    
    const num = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const z = (v, mean, std) => {
      const m = num(mean);
      const s = num(std);
      return (num(v) - m) / (s || 1);
    };

    let logit = num(model.intercept);

    logit += num(model.w_safety)
           * z(f.safety_feature,   model.mean_safety,   model.std_safety);

    logit += num(model.w_harsh)
           * z(f.harsh_feature,    model.mean_harsh,    model.std_harsh);

    logit += num(model.w_speeding)
           * z(f.speeding_feature, model.mean_speeding, model.std_speeding);

    const p = 1 / (1 + Math.exp(-logit));
    return Math.round(p * 10000) / 100;
  }

  classifyTier(score) {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  buildTopFactors(model, f) {
    const num = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const z = (v, mean, std) =>
      (num(v) - num(mean)) / (num(std) || 1);

    const contributions = [
      {
        name: 'Avg safety score (30d)',
        weight: Math.abs(
          num(model.w_safety) *
            z(f.safety_feature, model.mean_safety, model.std_safety)
        ),
        value: num(f.safety_feature),
      },
      {
        name: 'Harsh events per trip',
        weight: Math.abs(
          num(model.w_harsh) *
            z(f.harsh_feature, model.mean_harsh, model.std_harsh)
        ),
        value: num(f.harsh_feature),
      },
      {
        name: 'Speeding ratio',
        weight: Math.abs(
          num(model.w_speeding) *
            z(f.speeding_feature, model.mean_speeding, model.std_speeding)
        ),
        value: num(f.speeding_feature),
      },
      {
        name: 'Distance (30d, km)',
        weight: Math.abs(num(f.distance_feature) * 0.01),
        value: num(f.distance_feature),
      },
      {
        name: 'Days since last trip',
        weight: Math.abs(num(f.recency_feature) * 0.01),
        value: num(f.recency_feature),
      },
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

  recommendationFor(factorName) {
    const map = {
      'Avg safety score (30d)':  'Schedule a driver feedback session - a sustained low score indicates a behavioural pattern.',
      'Harsh events per trip':   'Review harsh braking and acceleration - recommend smooth-driving coaching.',
      'Speeding ratio':          'Reinforce speed-limit awareness - consider route and schedule review.',
      'Days since last trip':    'Vehicle has been idle; confirm no safety-critical issue on return to service.',
      'Distance (30d, km)':      'High mileage this month - check fatigue management and schedule adherence.',
    };
    return map[factorName] || 'Review recent driving behaviour.';
  }

  async predictAll() {
    const model = await this.getModel();
    if (!model) {
      throw new Error('No trained model found. Run scripts/trainRiskModel.js first.');
    }

    const { rows: features } = await this.pool.query(
      `SELECT * FROM vehicle_risk_features`
    );

    let scored = 0;
    const alerts = [];

    for (const f of features) {
      const score = this.scoreFeatures(model, f);
      const tier = this.classifyTier(score);
      const topFactors = this.buildTopFactors(model, f);

      await this.pool.query(
        `
        INSERT INTO vehicle_risk_predictions (
          vehicle_id, prediction_date, risk_score, risk_tier,
          feature_safety, feature_harsh, feature_crashes,
          feature_speeding, feature_weekend,
          feature_distance, feature_recency,
          top_factors, model_version
        ) VALUES (
          $1, CURRENT_DATE, $2, $3,
          $4, $5, 0,
          $6, 0,
          $7, $8,
          $9, $10
        )
        ON CONFLICT (vehicle_id, prediction_date) DO UPDATE SET
          risk_score       = EXCLUDED.risk_score,
          risk_tier        = EXCLUDED.risk_tier,
          feature_safety   = EXCLUDED.feature_safety,
          feature_harsh    = EXCLUDED.feature_harsh,
          feature_speeding = EXCLUDED.feature_speeding,
          feature_distance = EXCLUDED.feature_distance,
          feature_recency  = EXCLUDED.feature_recency,
          top_factors      = EXCLUDED.top_factors,
          model_version    = EXCLUDED.model_version
        `,
        [
          f.vehicle_id,
          score,
          tier,
          f.safety_feature,
          f.harsh_feature,
          f.speeding_feature,
          f.distance_feature,
          f.recency_feature,
          JSON.stringify(topFactors),
          model.id,
        ]
      );

      if (tier === 'high' || tier === 'critical') {
        const primary = topFactors[0]?.name || 'General risk';
        const text = this.recommendationFor(primary);

        await this.pool.query(
          `
          INSERT INTO coaching_interventions (
            vehicle_id, triggered_by_date, recommendation_text,
            primary_factor, risk_score_before
          ) VALUES ($1, CURRENT_DATE, $2, $3, $4)
          ON CONFLICT (vehicle_id, triggered_by_date) DO NOTHING
          `,
          [f.vehicle_id, text, primary, score]
        );

        alerts.push({
          vehicle_id: f.vehicle_id,
          message: `Vehicle ${f.vehicle_id} risk is ${tier.toUpperCase()} (${score}/100) - ${primary}`,
          tier,
        });
      }
      scored++;
    }

    for (const a of alerts) {
      await this.pool.query(
        `
        INSERT INTO risk_notification_log
          (vehicle_id, notification_type, message, risk_tier)
        VALUES ($1, 'risk_alert', $2, $3)
        `,
        [a.vehicle_id, a.message, a.tier]
      );
    }

    return { scored, alerts: alerts.length };
  }

  async getVehicleRisk(vehicleId, days = 30) {
    const { rows } = await this.pool.query(
      `
      SELECT prediction_date, risk_score, risk_tier, top_factors,
             feature_safety, feature_harsh,
             feature_speeding, feature_weekend,
             feature_distance, feature_recency
      FROM vehicle_risk_predictions
      WHERE vehicle_id = $1
        AND prediction_date >= CURRENT_DATE - $2::int
      ORDER BY prediction_date DESC
      `,
      [vehicleId, days]
    );

    if (rows.length === 0) return null;

    const latest = rows[0];
    return {
      vehicle_id: vehicleId,
      latest: {
        date: latest.prediction_date,
        risk_score: Number(latest.risk_score),
        risk_tier: latest.risk_tier,
        top_factors: latest.top_factors,
        features: {
          safety:   Number(latest.feature_safety),
          harsh:    Number(latest.feature_harsh),
          speeding: Number(latest.feature_speeding),
          weekend:  Number(latest.feature_weekend),
          distance: Number(latest.feature_distance),
          recency:  Number(latest.feature_recency),
        },
      },
      trend: rows
        .map((r) => ({
          date: r.prediction_date,
          risk_score: Number(r.risk_score),
          risk_tier: r.risk_tier,
        }))
        .reverse(),
    };
  }

  async getFleetRisk() {
    const { rows } = await this.pool.query(
      `
      SELECT vehicle_id, risk_score, risk_tier, top_factors, prediction_date
      FROM vehicle_risk_predictions
      WHERE prediction_date = (
        SELECT MAX(prediction_date) FROM vehicle_risk_predictions
      )
      ORDER BY risk_score DESC
      `
    );

    const ids = rows.map((r) => r.vehicle_id);
    if (!ids.length) return [];

    const { rows: trendRows } = await this.pool.query(
      `
      SELECT vehicle_id, prediction_date, risk_score
      FROM vehicle_risk_predictions
      WHERE vehicle_id = ANY($1::text[])
        AND prediction_date >= CURRENT_DATE - INTERVAL '14 days'
      ORDER BY vehicle_id, prediction_date ASC
      `,
      [ids]
    );

    const trendByVehicle = {};
    for (const r of trendRows) {
      if (!trendByVehicle[r.vehicle_id]) trendByVehicle[r.vehicle_id] = [];
      trendByVehicle[r.vehicle_id].push({
        date: r.prediction_date,
        score: Number(r.risk_score),
      });
    }

    return rows.map((r) => ({
      vehicle_id: r.vehicle_id,
      risk_score: Number(r.risk_score),
      risk_tier: r.risk_tier,
      top_factors: r.top_factors,
      prediction_date: r.prediction_date,
      trend: trendByVehicle[r.vehicle_id] || [],
    }));
  }

  async getCoachingHistory(vehicleId) {
    const { rows } = await this.pool.query(
      `
      SELECT id, created_at, recommendation_text, primary_factor,
             risk_score_before, risk_score_after_7d, outcome_delta
      FROM coaching_interventions
      WHERE vehicle_id = $1
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [vehicleId]
    );

    const measured = rows.filter((r) => r.outcome_delta !== null);
    const improved = measured.filter((r) => Number(r.outcome_delta) < 0);
    const rate = measured.length > 0 ? improved.length / measured.length : null;

    return {
      vehicle_id: vehicleId,
      effectiveness_rate: rate,
      interventions: rows.map((r) => ({
        id: r.id,
        created_at: r.created_at,
        recommendation: r.recommendation_text,
        primary_factor: r.primary_factor,
        risk_score_before: Number(r.risk_score_before),
        risk_score_after_7d:
          r.risk_score_after_7d !== null ? Number(r.risk_score_after_7d) : null,
        outcome_delta:
          r.outcome_delta !== null ? Number(r.outcome_delta) : null,
      })),
    };
  }

  async measureCoachingOutcomes() {
    const { rowCount } = await this.pool.query(
      `
      UPDATE coaching_interventions ci
      SET risk_score_after_7d = sub.avg_after,
          outcome_delta       = sub.avg_after - ci.risk_score_before,
          outcome_measured_at = NOW()
      FROM (
        SELECT ci2.id,
               (
                 SELECT AVG(risk_score)
                 FROM vehicle_risk_predictions vrp
                 WHERE vrp.vehicle_id = ci2.vehicle_id
                   AND vrp.prediction_date
                       BETWEEN ci2.triggered_by_date + 5
                           AND ci2.triggered_by_date + 9
               ) AS avg_after
        FROM coaching_interventions ci2
        WHERE ci2.outcome_delta IS NULL
          AND ci2.triggered_by_date <= CURRENT_DATE - 7
      ) AS sub
      WHERE ci.id = sub.id
        AND sub.avg_after IS NOT NULL
      `
    );
    return { updated: rowCount };
  }

  async getSimilarVehicles(vehicleId, k = 5) {
    const { rows } = await this.pool.query(
      `
      WITH target AS (
        SELECT safety_feature, harsh_feature, speeding_feature,
               weekend_feature, distance_feature, recency_feature
        FROM vehicle_risk_features
        WHERE vehicle_id = $1
      )
      SELECT
        f.vehicle_id,
        f.safety_feature, f.harsh_feature, f.speeding_feature,
        f.weekend_feature, f.distance_feature, f.recency_feature,
        p.risk_score, p.risk_tier,
        SQRT(
          POWER(f.safety_feature   - t.safety_feature,   2) +
          POWER(f.harsh_feature    - t.harsh_feature,    2) * 0.01 +
          POWER(f.speeding_feature - t.speeding_feature, 2) * 100 +
          POWER(f.weekend_feature  - t.weekend_feature,  2) * 100 +
          POWER(f.distance_feature - t.distance_feature, 2) * 0.0001 +
          POWER(f.recency_feature  - t.recency_feature,  2) * 0.01
        ) AS distance
      FROM vehicle_risk_features f
      CROSS JOIN target t
      LEFT JOIN vehicle_risk_predictions p
        ON p.vehicle_id = f.vehicle_id
       AND p.prediction_date = CURRENT_DATE
      WHERE f.vehicle_id <> $1
      ORDER BY distance ASC
      LIMIT $2
      `,
      [vehicleId, k]
    );

    return rows.map((r) => ({
      vehicle_id: r.vehicle_id,
      risk_score: r.risk_score !== null ? Number(r.risk_score) : null,
      risk_tier: r.risk_tier,
      distance: Math.round(Number(r.distance) * 100) / 100,
      features: {
        safety:   Number(r.safety_feature),
        harsh:    Number(r.harsh_feature),
        speeding: Number(r.speeding_feature),
        weekend:  Number(r.weekend_feature),
        distance: Number(r.distance_feature),
        recency:  Number(r.recency_feature),
      },
    }));
  }
}

module.exports = RiskPredictionService;
