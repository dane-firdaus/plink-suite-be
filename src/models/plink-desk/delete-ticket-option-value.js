const dbPool = require("../../config/db");

const deleteTicketOptionValue = async (optionId) => {
  const client = await dbPool.connect();

  try {
    const result = await client.query(
      `
        UPDATE support_ticket_option_values
        SET
          is_active = FALSE,
          updated_at = NOW()
        WHERE id = $1
          AND is_active = TRUE
        RETURNING id, field_name, option_value, created_at, updated_at
      `,
      [optionId]
    );

    if (!result.rows[0]) {
      const error = new Error("Ticket option not found");
      error.statusCode = 404;
      throw error;
    }

    return result.rows[0];
  } finally {
    client.release();
  }
};

module.exports = deleteTicketOptionValue;
