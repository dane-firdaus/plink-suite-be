const {
  normalizeOptionLookupValue,
  normalizeOptionValue,
} = require("./ticket-option-values-shared");

const createValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const assertTicketOptionValue = async (client, fieldName, rawValue, label) => {
  const optionValue = normalizeOptionValue(rawValue);

  if (!optionValue) {
    return;
  }

  const result = await client.query(
    `
      SELECT id
      FROM support_ticket_option_values
      WHERE field_name = $1
        AND normalized_value = $2
        AND is_active = TRUE
      LIMIT 1
    `,
    [fieldName, normalizeOptionLookupValue(optionValue)]
  );

  if (!result.rows[0]) {
    throw createValidationError(`${label} must be selected from ticket options.`);
  }
};

const assertTicketOptionValues = async (client, payload) => {
  await assertTicketOptionValue(client, "title", payload.title || payload.detail_0, "Title");
  await assertTicketOptionValue(client, "detail_1", payload.detail_1, "Detail 1");
};

module.exports = assertTicketOptionValues;
