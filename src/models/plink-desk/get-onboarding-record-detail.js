const dbPool = require("../../config/db");
const ensureOnboardingTables = require("./ensure-onboarding-tables");

const getOnboardingRecordDetail = async (recordId) => {
  const client = await dbPool.connect();

  try {
    await ensureOnboardingTables(client);

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
        WHERE id = $1
        LIMIT 1
      `,
      [recordId]
    );

    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

module.exports = getOnboardingRecordDetail;
