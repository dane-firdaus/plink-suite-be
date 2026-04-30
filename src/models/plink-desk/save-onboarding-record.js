const { v4: uuid } = require("uuid");
const dbPool = require("../../config/db");
const ensureOnboardingTables = require("./ensure-onboarding-tables");
const {
  appendOnboardingSheetRow,
  buildFingerprint,
  buildSearchText,
  getOnboardingSheetConfig,
  readOnboardingSheet,
  updateOnboardingSheetRow,
} = require("./onboarding-shared");

const resolveExternalKey = ({ headers, data }) => {
  const config = getOnboardingSheetConfig();
  const keyColumn = config.keyColumn;

  if (!keyColumn || !headers.includes(keyColumn)) {
    return "";
  }

  return String(data?.[keyColumn] || "").trim();
};

const saveOnboardingRecord = async ({
  recordId,
  headers = [],
  data = {},
  userEmail = "",
}) => {
  const client = await dbPool.connect();

  try {
    await ensureOnboardingTables(client);
    await client.query("BEGIN");

    const normalizedHeaders = headers.filter(Boolean);
    const normalizedData = normalizedHeaders.reduce((accumulator, header) => {
      accumulator[header] = String(data?.[header] ?? "").trim();
      return accumulator;
    }, {});
    const externalKey = resolveExternalKey({
      headers: normalizedHeaders,
      data: normalizedData,
    });
    const fingerprint = buildFingerprint(normalizedData);
    const searchText = buildSearchText(normalizedData);

    const existingResult = recordId
      ? await client.query(
          `
            SELECT id, sheet_row_number
            FROM plink_desk_onboarding_records
            WHERE id = $1
            LIMIT 1
          `,
          [recordId]
        )
      : { rows: [] };
    const existingRecord = existingResult.rows[0] || null;
    const id = existingRecord?.id || uuid();

    const result = await client.query(
      `
        INSERT INTO plink_desk_onboarding_records (
          id,
          external_key,
          sheet_row_number,
          data,
          headers,
          search_text,
          fingerprint,
          source,
          created_by,
          updated_by,
          created_at,
          updated_at
        ) VALUES (
          $1,
          NULLIF($2, ''),
          $3,
          $4::jsonb,
          $5::jsonb,
          $6,
          $7,
          'app',
          $8,
          $8,
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          external_key = NULLIF(EXCLUDED.external_key, ''),
          data = EXCLUDED.data,
          headers = EXCLUDED.headers,
          search_text = EXCLUDED.search_text,
          fingerprint = EXCLUDED.fingerprint,
          source = 'app',
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
        RETURNING *
      `,
      [
        id,
        externalKey,
        existingRecord?.sheet_row_number || null,
        JSON.stringify(normalizedData),
        JSON.stringify(normalizedHeaders),
        searchText,
        fingerprint,
        userEmail,
      ]
    );

    let savedRecord = result.rows[0];

    try {
      let sheetRowNumber = savedRecord.sheet_row_number;
      const sheetData = normalizedHeaders.length > 0 ? await readOnboardingSheet() : null;

      if (sheetData && sheetData.columns.length > 0) {
        if (sheetRowNumber) {
          await updateOnboardingSheetRow({
            rowNumber: sheetRowNumber,
            columns: sheetData.columns,
            data: normalizedData,
          });
        } else {
          sheetRowNumber = await appendOnboardingSheetRow({
            columns: sheetData.columns,
            data: normalizedData,
          });
        }

        savedRecord = (
          await client.query(
            `
              UPDATE plink_desk_onboarding_records
              SET
                sheet_row_number = COALESCE($2, sheet_row_number),
                synced_to_sheet_at = NOW(),
                updated_at = NOW()
              WHERE id = $1
              RETURNING *
            `,
            [id, sheetRowNumber]
          )
        ).rows[0];
      }
    } catch (sheetError) {
      console.error("Failed to push onboarding record to Google Sheets:", sheetError.message);
    }

    await client.query("COMMIT");
    return savedRecord;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = saveOnboardingRecord;
