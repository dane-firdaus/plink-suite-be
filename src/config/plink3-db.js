const { Pool } = require("pg");
require("dotenv").config();

const useSsl = (process.env.PLINK3_DB_SSL || "true").toLowerCase() !== "false";

const pool = new Pool({
  user: process.env.PLINK3_DB_USER,
  host: process.env.PLINK3_DB_HOST,
  database: process.env.PLINK3_DB_NAME,
  password: process.env.PLINK3_DB_PASS,
  port: Number(process.env.PLINK3_DB_PORT || 5432),
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
