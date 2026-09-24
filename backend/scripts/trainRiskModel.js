

require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number.parseInt(process.env.DB_PORT || '6432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false,
});



const REAL_DATA_START  = '2026-09-05';  
const OBSERVATION_END  = '2026-09-22';  
const FEATURE_WINDOW   = 7;           
const LEARNING_RATE    = 0.05;
const EPOCHS           = 3000;
const L2_LAMBDA        = 0.001;

const FEATURE_COLS = [
  'safety_feature',    
  'harsh_feature',     
  'speeding_feature',  
  'distance_feature',  
  'recency_feature',   
];



const sigmoid = (z) => 1 / (1 + Math.exp(-z));

function normalise(rows) {
  const stats = {};
  for (const c of FEATURE_COLS) {
    const vals = rows.map((r) => Number(r[c]) || 0);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    stats[c] = { mean, std: Math.sqrt(variance) || 1 };
  }
  return stats;
}

function toMatrix(rows, stats) {
  return rows.map((r) =>
    FEATURE_COLS.map((c) => ((Number(r[c]) || 0) - stats[c].mean) / stats[c].std)
  );
}

function train(X, y) {
  const n = X.length;
  const d = FEATURE_COLS.length;
  let w = new Array(d).fill(0);
  let b = 0;

  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    const gw = new Array(d).fill(0);
    let gb = 0;

    for (let i = 0; i < n; i++) {
      const z = b + X[i].reduce((s, x, j) => s + x * w[j], 0);
      const err = sigmoid(z) - y[i];
      gb += err;
      for (let j = 0; j < d; j++) gw[j] += err * X[i][j];
    }

    b -= (LEARNING_RATE * gb) / n;
    for (let j = 0; j < d; j++) {
      w[j] -= (LEARNING_RATE * gw[j]) / n + (L2_LAMBDA * w[j]);
    }

    if (epoch % 500 === 0) {
      const loss = -y.reduce((s, yy, i) => {
        const p = sigmoid(b + X[i].reduce((ss, x, j) => ss + x * w[j], 0));
        return s + (yy * Math.log(p + 1e-9) + (1 - yy) * Math.log(1 - p + 1e-9));
      }, 0) / n;
      console.log(`  epoch ${String(epoch).padStart(4)}: loss = ${loss.toFixed(4)}`);
    }
  }
  return { b, w };
}

function predictScores(b, w, X) {
  return X.map((row) => sigmoid(b + row.reduce((s, x, j) => s + x * w[j], 0)));
}

function evaluate(scores, y, threshold) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (let i = 0; i < scores.length; i++) {
    const pred = scores[i] >= threshold ? 1 : 0;
    if (pred === 1 && y[i] === 1) tp++;
    else if (pred === 1 && y[i] === 0) fp++;
    else if (pred === 0 && y[i] === 1) fn++;
    else tn++;
  }
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall    = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1        = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy  = (tp + tn) / scores.length;
  return { precision, recall, f1, accuracy, tp, fp, tn, fn };
}

function rocAuc(scores, y) {
  const pairs = scores.map((s, i) => [s, y[i]]).sort((a, b) => b[0] - a[0]);
  const nPos = y.filter((v) => v === 1).length;
  const nNeg = y.length - nPos;
  if (nPos === 0 || nNeg === 0) return 0.5;
  let tp = 0, auc = 0;
  for (const [, label] of pairs) {
    if (label === 1) tp++;
    else auc += tp;
  }
  return auc / (nPos * nNeg);
}

function calibrateThreshold(b, w, X, y) {
  const scores = predictScores(b, w, X);
  let bestThr = 0.5;
  let bestF1 = -1;
  for (let thr = 0.05; thr <= 0.95; thr += 0.05) {
    const m = evaluate(scores, y, thr);
    if (m.f1 > bestF1) { bestF1 = m.f1; bestThr = thr; }
  }
  return { threshold: bestThr, f1: bestF1 };
}



async function loadDataset() {
  const { rows } = await pool.query(
    `
    WITH observations AS (
      -- Every vehicle-day in the labelled window (has a next day)
      SELECT vehicle_id, score_date
      FROM driver_daily_safety_scores
      WHERE score_date BETWEEN '${REAL_DATA_START}' AND '${OBSERVATION_END}'
    ),
    labels AS (
      SELECT
        o.vehicle_id,
        o.score_date,
        COALESCE((
          SELECT CASE WHEN s2.safety_score = 0 THEN 1 ELSE 0 END
          FROM driver_daily_safety_scores s2
          WHERE s2.vehicle_id = o.vehicle_id
            AND s2.score_date = o.score_date + 1
        ), 0) AS label,
        -- Persistence baseline target: today's score
        COALESCE((
          SELECT CASE WHEN s3.safety_score = 0 THEN 1 ELSE 0 END
          FROM driver_daily_safety_scores s3
          WHERE s3.vehicle_id = o.vehicle_id
            AND s3.score_date = o.score_date
        ), 0) AS today_score
      FROM observations o
    ),
    features AS (
      SELECT
        l.vehicle_id,
        l.score_date,
        l.label,
        l.today_score,
        COALESCE((
          SELECT AVG(safety_score)
          FROM driver_daily_safety_scores s
          WHERE s.vehicle_id = l.vehicle_id
            AND s.score_date BETWEEN l.score_date - ${FEATURE_WINDOW} AND l.score_date - 1
        ), 100)::numeric AS safety_feature,
        COALESCE((
          SELECT SUM(harsh_brakes + harsh_accelerations + harsh_cornering)::numeric
                 / NULLIF(COUNT(DISTINCT t.trip_id), 0)
          FROM driver_daily_safety_scores s
          LEFT JOIN trips t
            ON t.vehicle_id = s.vehicle_id
           AND t.start_time::date = s.score_date
           AND t.status = 'completed'
          WHERE s.vehicle_id = l.vehicle_id
            AND s.score_date BETWEEN l.score_date - ${FEATURE_WINDOW} AND l.score_date - 1
        ), 0)::numeric AS harsh_feature,
        COALESCE((
          SELECT AVG(CASE WHEN max_speed_kmh > 100 THEN 1 ELSE 0 END)
          FROM trips t
          WHERE t.vehicle_id = l.vehicle_id
            AND t.status = 'completed'
            AND t.start_time::date BETWEEN l.score_date - ${FEATURE_WINDOW} AND l.score_date - 1
        ), 0)::numeric AS speeding_feature,
        COALESCE((
          SELECT SUM(distance_km)
          FROM trips t
          WHERE t.vehicle_id = l.vehicle_id
            AND t.status = 'completed'
            AND t.start_time::date BETWEEN l.score_date - ${FEATURE_WINDOW} AND l.score_date - 1
        ), 0)::numeric AS distance_feature,
        COALESCE((
          SELECT (l.score_date - 1 - MAX(t.end_time)::date)::numeric
          FROM trips t
          WHERE t.vehicle_id = l.vehicle_id
            AND t.status = 'completed'
            AND t.end_time::date <= l.score_date - 1
        ), 999)::numeric AS recency_feature
      FROM labels l
    )
    SELECT * FROM features
    ORDER BY score_date, vehicle_id
    `
  );
  return rows;
}



async function saveModel(b, w, stats, rowCount, trainMetrics, threshold) {
  await pool.query('DELETE FROM risk_model_weights');

  const idx = (name) => FEATURE_COLS.indexOf(name);
  const s   = (name) => stats[name];

  await pool.query(
    `
    INSERT INTO risk_model_weights (
      training_rows, training_days,
      intercept, w_safety, w_harsh, w_crashes, w_speeding, w_weekend,
      mean_safety, std_safety, mean_harsh, std_harsh,
      mean_crashes, std_crashes, mean_speeding, std_speeding,
      mean_weekend, std_weekend,
      precision_at_high, recall_at_high
    ) VALUES (
      $1, $2,
      $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12,
      $13, $14, $15, $16,
      $17, $18,
      $19, $20
    )
    `,
    [
      rowCount,
      FEATURE_WINDOW,
      b,
      w[idx('safety_feature')],
      w[idx('harsh_feature')],
      0,
      w[idx('speeding_feature')],
      0,
      s('safety_feature').mean,
      s('safety_feature').std,
      s('harsh_feature').mean,
      s('harsh_feature').std,
      0, 1,
      s('speeding_feature').mean,
      s('speeding_feature').std,
      0, 1,
      trainMetrics.precision,
      trainMetrics.recall,
    ]
  );

  console.log(`[TRAIN] Persisted. Decision threshold = ${threshold.toFixed(2)}`);
}



(async () => {
  try {
    console.log('[TRAIN] Loading dataset...');
    const rows = await loadDataset();
    console.log(`[TRAIN] ${rows.length} samples loaded`);

    if (rows.length < 50) {
      console.error('[TRAIN] Need at least 50 samples. Aborting.');
      process.exit(1);
    }

    const positives = rows.filter((r) => r.label === 1).length;
    console.log(
      `[TRAIN] Class balance: ${positives} positive / ${rows.length - positives} negative (${((positives / rows.length) * 100).toFixed(1)}% positive)`
    );

    
    
    const seeded = [...rows].sort((a, b) => {
      const ka = `${a.vehicle_id}-${a.score_date}`;
      const kb = `${b.vehicle_id}-${b.score_date}`;
      return ka.localeCompare(kb);
    });
    const splitIdx  = Math.floor(seeded.length * 0.8);
    const trainRows = seeded.slice(0, splitIdx);
    const testRows  = seeded.slice(splitIdx);
    console.log(`[TRAIN] Train: ${trainRows.length}, Test: ${testRows.length}`);

    const stats  = normalise(trainRows);
    const Xtrain = toMatrix(trainRows, stats);
    const ytrain = trainRows.map((r) => r.label);
    const Xtest  = toMatrix(testRows, stats);
    const ytest  = testRows.map((r) => r.label);

    console.log('[TRAIN] Training...');
    const { b, w } = train(Xtrain, ytrain);

    const cal = calibrateThreshold(b, w, Xtrain, ytrain);
    console.log(
      `[TRAIN] Calibrated threshold: ${cal.threshold.toFixed(2)} (train F1 = ${cal.f1.toFixed(3)})`
    );

    const trainScores = predictScores(b, w, Xtrain);
    const testScores  = predictScores(b, w, Xtest);

    const trainMetrics = evaluate(trainScores, ytrain, cal.threshold);
    const testMetrics  = evaluate(testScores,  ytest,  cal.threshold);
    const trainAuc     = rocAuc(trainScores, ytrain);
    const testAuc      = rocAuc(testScores,  ytest);

    console.log('[TRAIN] Train metrics:', trainMetrics, `AUC = ${trainAuc.toFixed(3)}`);
    console.log('[TRAIN] Test  metrics:', testMetrics,  `AUC = ${testAuc.toFixed(3)}`);

 
    
    const baselineScores = testRows.map((r) => Number(r.today_score) || 0);
    const baseAuc        = rocAuc(baselineScores, ytest);
    const baseMetrics    = evaluate(baselineScores, ytest, 0.5);
    console.log('[TRAIN] Persistence baseline (predict tomorrow = today):');
    console.log(`         AUC = ${baseAuc.toFixed(3)}`, baseMetrics);

    console.log('[TRAIN] Coefficients (standardised):');
    FEATURE_COLS.forEach((name, j) => {
      console.log(`  ${name.padEnd(20)} ${w[j].toFixed(4)}`);
    });
    console.log(`  ${'intercept'.padEnd(20)} ${b.toFixed(4)}`);

    await saveModel(b, w, stats, trainRows.length, trainMetrics, cal.threshold);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('[TRAIN] Fatal:', err);
    process.exit(1);
  }
})();
