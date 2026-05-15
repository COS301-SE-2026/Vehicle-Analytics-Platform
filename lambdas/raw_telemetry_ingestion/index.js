"use strict ";

const {S3Client, GetObjectCommand} = require("@aws-sdk/client-s3");
const {Pool} = require("pg");

// created once and reused across invocations
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      { rejectUnauthorized: false },
  max:      2,
});

const s3 = new S3Client({});

// parse one raw jsonl line into a db row
function parseRecord(raw) {
  if (!raw.time || !raw.vehicle_id) {
    console.warn("Skipping record missing time or vehicle_id:", raw);
    return null;
  }
 
  return [ // the columns of the table
    raw.time,
    raw.vehicle_id,
    raw.measurement        || null,
    raw.device_id          || null,
    raw.event              || null,
    raw.lat_lng            || null,
    raw.spd                || null,
    raw.total_odometer     || null,
    raw.ignition           || null,
    raw.movement           || null,
    raw.green_driving_type || null,
    raw.crash_detection    || null,
  ];
}

// 

async function processS3Object(bucket, key) {
  console.log(`Processing s3://${bucket}/${key}`);
 
  // Download the file from S3
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(command);
  const body = await response.Body.transformToString("utf-8");
 
  // Parse each line
  const rows = [];
  let errors = 0;
 
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
 
    try {
      const record = JSON.parse(trimmed);
      const row = parseRecord(record);
      if (row) rows.push(row);
      else errors++;
    } catch (e) {
      console.warn("Invalid JSON line:", trimmed, e.message);
      errors++;
    }
  }
 
  if (rows.length === 0) {
    console.log("No valid rows found in file.");
    return { file: key, parsed: 0, inserted: 0, errors };
  }
 
  // Bulk insert;; Builds one INSERT with all rows in a single query
  // ON CONFLICT DO NOTHING safely skips duplicate (time, vehicle_id) rows
  const columns = [
    "time", "vehicle_id", "measurement", "device_id", "event",
    "lat_lng", "spd", "total_odometer", "ignition", "movement",
    "green_driving_type", "crash_detection",
  ];
  const colCount = columns.length;
 
  const valuePlaceholders = rows
    .map((_, i) =>
      `(${columns.map((_, j) => `$${i * colCount + j + 1}`).join(", ")})`
    )
    .join(", ");
 
  const sql = `
    INSERT INTO raw_telemetry (${columns.join(", ")})
    VALUES ${valuePlaceholders}
    ON CONFLICT (time, vehicle_id) DO NOTHING
  `;
 
  const flatValues = rows.flat();
 
  const client = await pool.connect();
  let inserted = 0;
  try {
    const result = await client.query(sql, flatValues);
    inserted = result.rowCount !== null ? result.rowCount : rows.length;
  } finally {
    client.release();
  }
 
  console.log(
    `s3://${bucket}/${key} — parsed: ${rows.length}, inserted: ${inserted}, errors: ${errors}`
  );
  return { file: key, parsed: rows.length, inserted, errors };
}
 
// Lambda entry point 
const handler = async (event) => {
  const results = [];
 
  // S3 event trigger — fires automatically when a file lands in the bucket
  if (event.Records) {
    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key    = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
      results.push(await processS3Object(bucket, key));
    }
 
  // Manual invocation — for backfilling existing files or testing from console
  } else if (event.bucket && event.key) {
    results.push(await processS3Object(event.bucket, event.key));
 
  } else {
    throw new Error("Unexpected event shape. Pass an S3 event or { bucket, key }.");
  }
 
  const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
  const totalErrors   = results.reduce((sum, r) => sum + r.errors,   0);
 
  console.log(`Run complete — total inserted: ${totalInserted}, total errors: ${totalErrors}`);
 
  return {
    statusCode: 200,
    body: {
      files_processed: results.length,
      total_inserted:  totalInserted,
      total_errors:    totalErrors,
      details:         results,
    },
  };
};
 
module.exports = { handler };

