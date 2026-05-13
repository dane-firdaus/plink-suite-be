const {
  normalizeOptionLookupValue,
  normalizeOptionValue,
} = require("./ticket-option-values-shared");

const ensureTicketOptionValue = async (client, fieldName, rawValue) => {
  const optionValue = normalizeOptionValue(rawValue);

  if (!optionValue) {
    return null;
  }

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
      VALUES (gen_random_uuid(), $1, $2, $3, TRUE, NOW(), NOW())
      ON CONFLICT (field_name, normalized_value) DO UPDATE
      SET
        option_value = EXCLUDED.option_value,
        is_active = TRUE,
        updated_at = NOW()
      RETURNING id, field_name, option_value
    `,
    [fieldName, optionValue, normalizeOptionLookupValue(optionValue)]
  );

  return result.rows[0] || null;
};

const ensureTicketOptionValues = async (client, payload) => {
  await ensureTicketOptionValue(client, "title", payload.title || payload.detail_0);
  await ensureTicketOptionValue(client, "detail_1", payload.detail_1);
};

module.exports = ensureTicketOptionValues;
