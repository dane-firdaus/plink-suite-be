const ensureOnboardingTables = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS plink_desk_onboarding_records (
      id UUID PRIMARY KEY,
      external_key VARCHAR(255) NULL,
      sheet_row_number INTEGER NULL,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      headers JSONB NOT NULL DEFAULT '[]'::jsonb,
      search_text TEXT NOT NULL DEFAULT '',
      fingerprint VARCHAR(64) NOT NULL DEFAULT '',
      source VARCHAR(20) NOT NULL DEFAULT 'app' CHECK (source IN ('app', 'sheet', 'sync')),
      created_by VARCHAR(150) NOT NULL DEFAULT '',
      updated_by VARCHAR(150) NOT NULL DEFAULT '',
      synced_from_sheet_at TIMESTAMP NULL,
      synced_to_sheet_at TIMESTAMP NULL,
      sheet_updated_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_external_key
      ON plink_desk_onboarding_records(external_key)
      WHERE external_key IS NOT NULL AND external_key <> '';
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_sheet_row_number
      ON plink_desk_onboarding_records(sheet_row_number)
      WHERE sheet_row_number IS NOT NULL;
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_onboarding_updated_at
      ON plink_desk_onboarding_records(updated_at DESC);
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_onboarding_source
      ON plink_desk_onboarding_records(source);
  `);
};

module.exports = ensureOnboardingTables;
