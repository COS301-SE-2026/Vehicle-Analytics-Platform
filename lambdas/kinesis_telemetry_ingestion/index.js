if (process.env.NODE_ENV !== "production") require("dotenv").config();

const { Pool } = require("pg");

// Created once when the Lambda container starts, reused across warm invocations
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     Number.parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      { rejectUnauthorized: false },
  max:      2,
});

const INSERT_SQL = `
  INSERT INTO raw_telemetry (
    time, vehicle_id, measurement, device_id, event,
    lat_lng, spd, total_odometer, ignition, movement,
    green_driving_type, crash_detection
  )
  VALUES %s
  ON CONFLICT (time, vehicle_id) DO NOTHING
`;

const COLUMNS = [
  "time", "vehicle_id", "measurement", "device_id", "event",
  "lat_lng", "spd", "total_odometer", "ignition", "movement",
  "green_driving_type", "crash_detection",
];

// Parse one decoded Kinesis record into a DB row ;; stream_time is Kinesis metadata - not stored in raw_telemetry
function parseRecord(data) {
  if (!data.time || !data.vehicle_id) {
    console.warn("Skipping record missing time or vehicle_id:", data);
    return null;
  }

  return [
    data.time,
    data.vehicle_id,
    data.measurement        || null,
    data.device_id          || null,
    data.event              || null,
    data.lat_lng            || null,
    data.spd                || null,
    data.total_odometer     || null,
    data.ignition           || null,
    data.movement           || null,
    data.green_driving_type || null,
    data.crash_detection    || null,
  ];
}

// Build a bulk INSERT with parameterised placeholders 
function buildInsert(rows) {
  const colCount = COLUMNS.length;

  const placeholders = rows
    .map((_, i) => `(${COLUMNS.map((_, j) => `$${i * colCount + j + 1}`).join(", ")})`).join(", ");

  const sql = `
    INSERT INTO raw_telemetry (${COLUMNS.join(", ")})
    VALUES ${placeholders}
    ON CONFLICT (time, vehicle_id) DO NOTHING
  `;

  return { sql, values: rows.flat() };
}

// our Lambda entry point 
const handler = async (event) => {
  const rows            = [];
  const sequenceNumbers = []; // tracks which sequence number maps to which row
  const failedItems     = []; // collects failed sequence numbers for DLQ
  let errors            = 0;

  for (const record of event.Records) {
    const sequenceNumber = record.kinesis.sequenceNumber;

    // Kinesis data is base64 encoded - decode it first
    const payload = Buffer.from(record.kinesis.data, "base64").toString("utf-8");

    let data;
    try {
      data = JSON.parse(payload);
    } catch (e) {
      console.warn("Invalid JSON in record:", payload, e.message);
      failedItems.push({ itemIdentifier: sequenceNumber });
      errors++;
      continue;
    }

    const row = parseRecord(data);
    if (row) {
      rows.push(row);
      sequenceNumbers.push(sequenceNumber);
    } else {
      failedItems.push({ itemIdentifier: sequenceNumber });
      errors++;
    }
  }

  console.info(`Batch received - valid rows: ${rows.length}, skipped: ${errors}`);

  if (rows.length > 0) {
    const { sql, values } = buildInsert(rows);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(sql, values);
      await client.query("COMMIT");
      console.info(`Inserted ${result.rowCount} rows into raw_telemetry`);
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("DB insert failed:", e.message);
      for (const seq of sequenceNumbers) {
        failedItems.push({ itemIdentifier: seq });
      }
      throw e;
    } finally {
      client.release();
    }
  }

  if (failedItems.length > 0) {
    console.warn(`Reporting ${failedItems.length} failed items to DLQ`);
  }

  return {
    batchItemFailures: failedItems,
    statusCode: 200,
    body: {
      records_received: event.Records.length,
      rows_inserted:    rows.length,
      errors,
    },
  };
};

module.exports = { handler, parseRecord, buildInsert, pool };