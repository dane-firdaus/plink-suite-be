CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS support_ticket_option_values (
  id UUID PRIMARY KEY,
  field_name VARCHAR(50) NOT NULL,
  option_value VARCHAR(255) NOT NULL,
  normalized_value VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT support_ticket_option_values_field_name_check
    CHECK (field_name IN ('title', 'detail_1'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_ticket_option_values_unique
  ON support_ticket_option_values(field_name, normalized_value);

CREATE INDEX IF NOT EXISTS idx_support_ticket_option_values_field_name
  ON support_ticket_option_values(field_name, option_value);

INSERT INTO support_ticket_option_values (id, field_name, option_value, normalized_value)
SELECT
  gen_random_uuid(),
  'title',
  source.option_value,
  source.normalized_value
FROM (
  SELECT DISTINCT ON (normalized_value)
    option_value,
    normalized_value
  FROM (
    SELECT
      TRIM(COALESCE(detail_0, title, '')) AS option_value,
      LOWER(TRIM(COALESCE(detail_0, title, ''))) AS normalized_value
    FROM support_tickets
  ) seeded
  WHERE option_value <> ''
  ORDER BY normalized_value, option_value
) AS source
ON CONFLICT (field_name, normalized_value) DO UPDATE
SET
  option_value = EXCLUDED.option_value,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO support_ticket_option_values (id, field_name, option_value, normalized_value)
SELECT
  gen_random_uuid(),
  'detail_1',
  source.option_value,
  source.normalized_value
FROM (
  SELECT DISTINCT ON (normalized_value)
    option_value,
    normalized_value
  FROM (
    SELECT
      TRIM(COALESCE(detail_1, '')) AS option_value,
      LOWER(TRIM(COALESCE(detail_1, ''))) AS normalized_value
    FROM support_tickets
  ) seeded
  WHERE option_value <> ''
  ORDER BY normalized_value, option_value
) AS source
ON CONFLICT (field_name, normalized_value) DO UPDATE
SET
  option_value = EXCLUDED.option_value,
  is_active = TRUE,
  updated_at = NOW();
