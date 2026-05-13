const dbPool = require("../../config/db");

const listTicketOptionValues = async ({ fieldName, search = "", page = 1, limit = 50 }) => {
  const client = await dbPool.connect();

  try {
    const normalizedSearch = search.trim();
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const countResult = await client.query(
      `
        SELECT COUNT(*)::int AS total
        FROM support_ticket_option_values
        WHERE field_name = $1
          AND is_active = TRUE
          AND (
            $2 = ''
            OR option_value ILIKE '%' || $2 || '%'
          )
      `,
      [fieldName, normalizedSearch]
    );

    const result = await client.query(
      `
        SELECT id, field_name, option_value, created_at, updated_at
        FROM support_ticket_option_values
        WHERE field_name = $1
          AND is_active = TRUE
          AND (
            $2 = ''
            OR option_value ILIKE '%' || $2 || '%'
        )
        ORDER BY option_value ASC
        LIMIT $3
        OFFSET $4
      `,
      [fieldName, normalizedSearch, safeLimit, offset]
    );

    const totalData = countResult.rows[0]?.total || 0;

    return {
      data: result.rows,
      pagination: {
        totalData,
        totalPage: Math.ceil(totalData / safeLimit) || 1,
        rowPerPage: safeLimit,
        currentPage: safePage,
      },
    };
  } finally {
    client.release();
  }
};

module.exports = listTicketOptionValues;
