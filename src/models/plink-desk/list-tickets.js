const dbPool = require("../../config/db");
const { TICKET_BASE_SELECT } = require("./shared");

const listTickets = async ({
  page = 1,
  limit = 10,
  search = "",
  status = "",
  priority = "",
  category_code = "",
  channel = "",
  bank = "",
  product = "",
  category_group = "",
  date_from = null,
  date_to = null,
}) => {
  const offset = (page - 1) * limit;
  const normalizedDateFrom = date_from || null;
  const normalizedDateTo = date_to || null;
  const query = `
    SELECT ticket_rows.*, COUNT(*) OVER() AS total_count
    FROM (
      ${TICKET_BASE_SELECT}
      WHERE
        (
          COALESCE($1, '') = ''
          OR st.ticket_number ILIKE '%' || $1 || '%'
          OR st.title ILIKE '%' || $1 || '%'
          OR st.customer_name ILIKE '%' || $1 || '%'
          OR st.merchant_id ILIKE '%' || $1 || '%'
          OR st.merchant_name ILIKE '%' || $1 || '%'
          OR st.sender ILIKE '%' || $1 || '%'
        )
        AND (COALESCE($2, '') = '' OR st.status = $2)
        AND (COALESCE($3, '') = '' OR st.priority = $3)
        AND (COALESCE($4, '') = '' OR st.detail_category_code = $4)
        AND (COALESCE($5, '') = '' OR st.channel = $5)
        AND (COALESCE($6, '') = '' OR st.bank = $6)
        AND (COALESCE($7, '') = '' OR st.product = $7)
        AND (COALESCE($8, '') = '' OR st.category_group = $8)
        AND ($9::date IS NULL OR st.ticket_date::date >= $9::date)
        AND ($10::date IS NULL OR st.ticket_date::date <= $10::date)
    ) AS ticket_rows
    ORDER BY ticket_rows.ticket_date DESC, ticket_rows.updated_at DESC
    LIMIT $11 OFFSET $12
  `;

  const client = await dbPool.connect();

  try {
    const result = await client.query(query, [
      search,
      status,
      priority,
      category_code,
      channel,
      bank,
      product,
      category_group,
      normalizedDateFrom,
      normalizedDateTo,
      limit,
      offset,
    ]);
    const totalCount = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;

    return {
      data: result.rows.map(({ total_count, ...row }) => row),
      pagination: {
        totalData: totalCount,
        totalPage: Math.ceil(totalCount / limit),
        rowPerPage: limit,
        currentPage: page,
      },
    };
  } finally {
    client.release();
  }
};

module.exports = listTickets;
