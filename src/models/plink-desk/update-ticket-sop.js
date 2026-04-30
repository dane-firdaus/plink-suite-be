const dbPool = require("../../config/db");

const updateTicketSop = async (sopId, { code, title, content }) => {
  const client = await dbPool.connect();

  try {
    const result = await client.query(
      `
        UPDATE support_ticket_sops
        SET code = $2, title = $3, content = $4, updated_at = NOW()
        WHERE id = $1
        RETURNING id, code, title, content, created_at, updated_at
      `,
      [sopId, code, title, content]
    );

    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

module.exports = updateTicketSop;
