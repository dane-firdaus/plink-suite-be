const { v4: uuid } = require("uuid");
const dbPool = require("../../config/db");
const ensureCrmSalesTable = require("./ensure-crm-sales-table");

const createSales = async ({ sales_name, sales_email, sales_phone = "", actor = "" }) => {
  const client = await dbPool.connect();

  try {
    await ensureCrmSalesTable(client);

    const result = await client.query(
      `
        INSERT INTO crm_sales (
          id,
          sales_name,
          sales_email,
          sales_phone,
          created_by,
          updated_by,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $5, NOW(), NOW()
        )
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
      [uuid(), sales_name, sales_email.toLowerCase(), sales_phone, actor]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
};

module.exports = createSales;
