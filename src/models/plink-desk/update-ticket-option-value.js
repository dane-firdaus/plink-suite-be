const dbPool = require("../../config/db");
const {
  normalizeOptionLookupValue,
  normalizeOptionValue,
} = require("./ticket-option-values-shared");

const updateTicketOptionValue = async ({ optionId, fieldName, optionValue }) => {
  const client = await dbPool.connect();

  try {
    const normalizedValue = normalizeOptionValue(optionValue);
    const existingResult = await client.query(
      `
        SELECT id
        FROM support_ticket_option_values
        WHERE id = $1
      `,
      [optionId]
    );

    if (!existingResult.rows[0]) {
      const error = new Error("Ticket option not found");
      error.statusCode = 404;
      throw error;
    }

    try {
      const result = await client.query(
        `
          UPDATE support_ticket_option_values
          SET
            field_name = $2,
            option_value = $3,
            normalized_value = $4,
            is_active = TRUE,
            updated_at = NOW()
          WHERE id = $1
          RETURNING id, field_name, option_value, created_at, updated_at
        `,
        [optionId, fieldName, normalizedValue, normalizeOptionLookupValue(normalizedValue)]
      );

      return result.rows[0] || null;
    } catch (error) {
      if (error.code === "23505") {
        const conflictError = new Error("Ticket option value already exists");
        conflictError.statusCode = 409;
        throw conflictError;
      }

      throw error;
    }
  } finally {
    client.release();
  }
};

module.exports = updateTicketOptionValue;
