const dbPool = require("../../config/db");

const listTicketSops = async () => {
  const client = await dbPool.connect();

  try {
    const result = await client.query(`
      SELECT id, code, title, content, created_at, updated_at
      FROM support_ticket_sops
      WHERE is_active = TRUE
      ORDER BY code ASC
    `);

    return result.rows;
  } finally {
    client.release();
  }
};

module.exports = listTicketSops;
