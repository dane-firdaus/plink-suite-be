const plink3DbPool = require("../../config/plink3-db");

const listMerchantOptions = async ({ search = "", page = 1, limit = 20 }) => {
  const client = await plink3DbPool.connect();

  try {
    const normalizedSearch = search.trim();
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const countResult = await client.query(
      `
        SELECT COUNT(*)::int AS total
        FROM (
          SELECT DISTINCT merchant_name, merchant_code
          FROM public.merchant
          WHERE COALESCE(is_active, 'Y') = 'Y'
            AND merchant_name IS NOT NULL
            AND merchant_name <> ''
            AND (
              $1 = ''
              OR merchant_name ILIKE '%' || $1 || '%'
              OR merchant_code ILIKE '%' || $1 || '%'
            )
        ) merchants
      `,
      [normalizedSearch]
    );

    const result = await client.query(
      `
        SELECT DISTINCT ON (merchant_name, merchant_code)
          merchant_name,
          merchant_code AS merchant_id
        FROM public.merchant
        WHERE COALESCE(is_active, 'Y') = 'Y'
          AND merchant_name IS NOT NULL
          AND merchant_name <> ''
          AND (
            $1 = ''
            OR merchant_name ILIKE '%' || $1 || '%'
            OR merchant_code ILIKE '%' || $1 || '%'
          )
        ORDER BY merchant_name, merchant_code
        LIMIT $2
        OFFSET $3
      `,
      [normalizedSearch, safeLimit, offset]
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

module.exports = listMerchantOptions;
