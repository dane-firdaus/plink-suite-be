const { sql, reportPoolConnect } = require("../../config/report-db");

const listProductTypes = async () => {
  const pool = await reportPoolConnect;
  const request = pool.request();

  const result = await request.query(`
    SELECT DISTINCT LTRIM(RTRIM(payment_type)) AS payment_type
    FROM v_report_dummy
    WHERE NULLIF(LTRIM(RTRIM(payment_type)), '') IS NOT NULL
    ORDER BY payment_type ASC;
  `);

  return result.recordset.map((row) => row.payment_type);
};

module.exports = listProductTypes;
