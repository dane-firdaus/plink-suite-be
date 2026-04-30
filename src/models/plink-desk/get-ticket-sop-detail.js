const dbPool = require("../../config/db");

const getTicketSopDetail = async (sopId) => {
  const client = await dbPool.connect();

  try {
    const result = await client.query(
      `
        SELECT id, code, title, content, created_at, updated_at
        FROM support_ticket_sops
        WHERE id = $1
      `,
      [sopId]
    );

    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

module.exports = getTicketSopDetail;
