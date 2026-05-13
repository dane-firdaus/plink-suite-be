const { v4: uuid } = require("uuid");
const dbPool = require("../../config/db");
const {
  normalizeOptionLookupValue,
  normalizeOptionValue,
} = require("./ticket-option-values-shared");

const createTicketOptionValue = async ({ fieldName, optionValue }) => {
  const client = await dbPool.connect();

  try {
    const normalizedValue = normalizeOptionValue(optionValue);

    const result = await client.query(
      `
        INSERT INTO support_ticket_option_values (
          id,
          field_name,
          option_value,
          normalized_value,
          is_active,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
        ON CONFLICT (field_name, normalized_value) DO UPDATE
        SET
          option_value = EXCLUDED.option_value,
          is_active = TRUE,
          updated_at = NOW()
        RETURNING id, field_name, option_value, created_at, updated_at
      `,
      [uuid(), fieldName, normalizedValue, normalizeOptionLookupValue(normalizedValue)]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
};

module.exports = createTicketOptionValue;
