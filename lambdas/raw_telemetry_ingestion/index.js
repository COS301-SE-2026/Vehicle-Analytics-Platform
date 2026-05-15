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

// parse one raw jsonlline into a db row
