const dbPool = require("../../config/db");
const ensureOnboardingTables = require("./ensure-onboarding-tables");
const {
  isOnboardingSyncConfigured,
  readOnboardingSheet,
} = require("./onboarding-shared");

const getOnboardingSchema = async () => {
  if (isOnboardingSyncConfigured()) {
    try {
      const sheetData = await readOnboardingSheet();

      return {
        headers: sheetData.headers,
        source: "sheet",
        sheet_name: sheetData.sheetName,
        configured: true,
      };
    } catch (error) {
      console.error("Failed to resolve onboarding sheet schema:", error.message);
    }
  }

  const client = await dbPool.connect();

  try {
    await ensureOnboardingTables(client);

    const result = await client.query(`
      SELECT headers
      FROM plink_desk_onboarding_records
      WHERE jsonb_array_length(headers) > 0
      ORDER BY updated_at DESC
      LIMIT 1
    `);

    return {
      headers: result.rows[0]?.headers || [],
      source: "database",
      sheet_name: "",
      configured: isOnboardingSyncConfigured(),
    };
  } finally {
    client.release();
  }
};

module.exports = getOnboardingSchema;
