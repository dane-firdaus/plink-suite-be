const dbPool = require("../../config/db");
const ensureOnboardingTables = require("./ensure-onboarding-tables");

const listOnboardingRecords = async ({ page = 1, limit = 50, search = "" }) => {
  const client = await dbPool.connect();

  try {
    await ensureOnboardingTables(client);

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.max(Number(limit) || 50, 1);
    const offset = (safePage - 1) * safeLimit;
    const normalizedSearch = String(search || "").trim().toLowerCase();

    const countResult = await client.query(
      `
        SELECT COUNT(*)::int AS total_data
        FROM plink_desk_onboarding_records
        WHERE ($1 = '' OR search_text LIKE '%' || $1 || '%')
      `,
      [normalizedSearch]
    );

    const result = await client.query(
      `
        SELECT
          id,
          external_key,
          sheet_row_number,
          data,
          headers,
          source,
          created_by,
          updated_by,
          synced_from_sheet_at,
          synced_to_sheet_at,
          created_at,
          updated_at
        FROM plink_desk_onboarding_records
        WHERE ($1 = '' OR search_text LIKE '%' || $1 || '%')
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

module.exports = listOnboardingRecords;
