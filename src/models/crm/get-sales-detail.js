const dbPool = require("../../config/db");
const ensureCrmSalesTable = require("./ensure-crm-sales-table");

const getSalesDetail = async (salesId) => {
  const client = await dbPool.connect();

  try {
    await ensureCrmSalesTable(client);

    const result = await client.query(
      `
        SELECT
          id,
          sales_name,
          sales_email,
          sales_phone,
          created_by,
          updated_by,
          created_at,
          updated_at
        FROM crm_sales
        WHERE id = $1
        LIMIT 1
      `,
      [salesId]
    );

    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

module.exports = getSalesDetail;
