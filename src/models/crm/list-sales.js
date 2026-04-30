const dbPool = require("../../config/db");
const ensureCrmSalesTable = require("./ensure-crm-sales-table");

const listSales = async ({ page = 1, limit = 50, search = "" }) => {
  const client = await dbPool.connect();

  try {
    await ensureCrmSalesTable(client);

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.max(Number(limit) || 50, 1);
    const offset = (safePage - 1) * safeLimit;
    const normalizedSearch = String(search || "").trim().toLowerCase();

    const countResult = await client.query(
      `
        SELECT COUNT(*)::int AS total_data
        FROM crm_sales
        WHERE (
          $1 = ''
          OR LOWER(sales_name) LIKE '%' || $1 || '%'
          OR LOWER(sales_email) LIKE '%' || $1 || '%'
          OR LOWER(sales_phone) LIKE '%' || $1 || '%'
        )
      `,
      [normalizedSearch]
    );

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
        WHERE (
          $1 = ''
          OR LOWER(sales_name) LIKE '%' || $1 || '%'
          OR LOWER(sales_email) LIKE '%' || $1 || '%'
          OR LOWER(sales_phone) LIKE '%' || $1 || '%'
        )
        ORDER BY updated_at DESC, created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [normalizedSearch, safeLimit, offset]
    );

    return {
      data: result.rows,
      pagination: {
        totalData: countResult.rows[0]?.total_data || 0,
        totalPage: Math.ceil((countResult.rows[0]?.total_data || 0) / safeLimit),
        rowPerPage: safeLimit,
        currentPage: safePage,
      },
    };
  } finally {
    client.release();
  }
};

module.exports = listSales;
