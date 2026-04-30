const plink3DbPool = require("../../config/plink3-db");

const listMerchantOptions = async ({ search = "", limit = 20 }) => {
  const client = await plink3DbPool.connect();

  try {
    const normalizedSearch = search.trim();
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

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
      `,
      [normalizedSearch, safeLimit]
    );

    return result.rows;
  } finally {
    client.release();
  }
};

module.exports = listMerchantOptions;
