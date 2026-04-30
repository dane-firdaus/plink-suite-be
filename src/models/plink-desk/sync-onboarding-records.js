const dbPool = require("../../config/db");
const { v4: uuid } = require("uuid");
const ensureOnboardingTables = require("./ensure-onboarding-tables");
const {
  buildFingerprint,
  buildSearchText,
  readOnboardingSheet,
} = require("./onboarding-shared");

const syncOnboardingRecords = async () => {
  const sheetData = await readOnboardingSheet();
  const client = await dbPool.connect();

  try {
    await ensureOnboardingTables(client);
    await client.query("BEGIN");

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of sheetData.rows) {
      const externalKey = sheetData.keyColumn
        ? String(row.data?.[sheetData.keyColumn] || "").trim()
        : "";
      const fingerprint = buildFingerprint(row.data);
      const searchText = buildSearchText(row.data);

      const existingResult = await client.query(
        `
          SELECT id, fingerprint
          FROM plink_desk_onboarding_records
          WHERE
            (
              NULLIF($1, '') IS NOT NULL
              AND external_key = NULLIF($1, '')
            )
            OR sheet_row_number = $2
          ORDER BY updated_at DESC
          LIMIT 1
        `,
        [externalKey, row.rowNumber]
      );

      const existingRecord = existingResult.rows[0] || null;

      if (!existingRecord) {
        await client.query(
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
              synced_from_sheet_at,
              sheet_updated_at,
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
              'sheet',
              NOW(),
              NOW(),
              NOW(),
              NOW()
            )
          `,
          [
            uuid(),
            externalKey,
            row.rowNumber,
            JSON.stringify(row.data),
            JSON.stringify(sheetData.headers),
            searchText,
            fingerprint,
          ]
        );
        inserted += 1;
        continue;
      }

      if (existingRecord.fingerprint === fingerprint) {
        skipped += 1;
        continue;
      }

      await client.query(
        `
          UPDATE plink_desk_onboarding_records
          SET
            external_key = NULLIF($2, ''),
            sheet_row_number = $3,
            data = $4::jsonb,
            headers = $5::jsonb,
            search_text = $6,
            fingerprint = $7,
            source = 'sync',
            synced_from_sheet_at = NOW(),
            sheet_updated_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          existingRecord.id,
          externalKey,
          row.rowNumber,
          JSON.stringify(row.data),
          JSON.stringify(sheetData.headers),
          searchText,
          fingerprint,
        ]
      );
      updated += 1;
    }

    await client.query("COMMIT");

    return {
      inserted,
      updated,
      skipped,
      headers: sheetData.headers,
      sheet_name: sheetData.sheetName,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = syncOnboardingRecords;
