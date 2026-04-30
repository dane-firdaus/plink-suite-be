const sql = require("mssql");
require("dotenv").config();

const reportPool = new sql.ConnectionPool({
  user: process.env.REPORT_DB_USER || process.env.DB_USER,
  password: process.env.REPORT_DB_PASS || process.env.DB_PASS,
  server: process.env.REPORT_DB_HOST || process.env.DB_HOST,
  port: Number(process.env.REPORT_DB_PORT || process.env.DB_PORT),
  database: process.env.REPORT_DB_NAME || process.env.DB_NAME,
  options: {
    trustServerCertificate: true,
    encrypt: false,
  },
  connectionTimeout: 30000,
  requestTimeout: 60000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
});

const reportPoolConnect = reportPool.connect();

module.exports = {
  sql,
  reportPool,
  reportPoolConnect,
};
