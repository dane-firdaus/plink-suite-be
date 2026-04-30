const dbPool = require("../../config/db");
const ensureCrmSalesTable = require("./ensure-crm-sales-table");

const deleteSales = async (salesId) => {
  const client = await dbPool.connect();

  try {
    await ensureCrmSalesTable(client);

    const result = await client.query(
      `
        DELETE FROM crm_sales
        WHERE id = $1
        RETURNING id, sales_name, sales_email
      `,
      [salesId]
    );

    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

module.exports = deleteSales;
