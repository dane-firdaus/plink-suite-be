const dbPool = require("../../config/db");
const ensureCrmSalesTable = require("./ensure-crm-sales-table");

const updateSales = async ({
  salesId,
  sales_name,
  sales_email,
  sales_phone = "",
  actor = "",
}) => {
  const client = await dbPool.connect();

  try {
    await ensureCrmSalesTable(client);

    const result = await client.query(
      `
        UPDATE crm_sales
        SET
          sales_name = $2,
          sales_email = $3,
          sales_phone = $4,
          updated_by = $5,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          sales_name,
          sales_email,
          sales_phone,
          created_by,
          updated_by,
          created_at,
          updated_at
      `,
      [salesId, sales_name, sales_email.toLowerCase(), sales_phone, actor]
    );

    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

module.exports = updateSales;
