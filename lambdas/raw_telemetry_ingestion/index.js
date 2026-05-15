"use strict ";

const {S3Client, GetObjectCommand} = require("aws-sdk/client-s3");
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

async function processS3Object(bucket, key){
    // console.log(`Processing s3://${bucket}/${key}`);

}

