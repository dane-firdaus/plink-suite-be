const dbPool = require("../../config/db");

const listDivisions = async ({ name, limit = 100, page = 1 }) => {
  const offset = (page - 1) * limit;
  const client = await dbPool.connect();

  try {
    const result = await client.query(
      `
        SELECT
          division_id,
          name,
          description,
          COUNT(*) OVER() AS total_count
        FROM divisions
        WHERE COALESCE($1, '') = '' OR name ILIKE '%' || $1 || '%'
        ORDER BY name ASC
        LIMIT $2 OFFSET $3
      `,
      [name || "", limit, offset]
    );

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

module.exports = listDivisions;
