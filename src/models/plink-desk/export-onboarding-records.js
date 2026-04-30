const ExcelJS = require("exceljs");
const dbPool = require("../../config/db");
const ensureOnboardingTables = require("./ensure-onboarding-tables");
const {
  loadOnboardingWorkbook,
  TEMPLATE_DATA_START_ROW,
  buildSheetRowValues,
} = require("./onboarding-shared");

const exportOnboardingRecords = async ({ search = "" }) => {
  const client = await dbPool.connect();

  try {
    await ensureOnboardingTables(client);

    const normalizedSearch = String(search || "").trim().toLowerCase();
    const result = await client.query(
      `
        SELECT data
        FROM plink_desk_onboarding_records
        WHERE ($1 = '' OR search_text LIKE '%' || $1 || '%')
        ORDER BY updated_at DESC, created_at DESC
      `,
      [normalizedSearch]
    );

    const { buffer, sheetName, columns } = await loadOnboardingWorkbook();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet(sheetName) || workbook.worksheets[0];

    if (!worksheet) {
      throw new Error("Onboarding worksheet template not found.");
    }

    if (worksheet.rowCount >= TEMPLATE_DATA_START_ROW) {
      worksheet.spliceRows(
        TEMPLATE_DATA_START_ROW,
        worksheet.rowCount - TEMPLATE_DATA_START_ROW + 1
      );
    }

    result.rows.forEach((row) => {
      worksheet.addRow(buildSheetRowValues(columns, row.data || {}));
    });

    return workbook.xlsx.writeBuffer();
  } finally {
    client.release();
  }
};

module.exports = exportOnboardingRecords;
