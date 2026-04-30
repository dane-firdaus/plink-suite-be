const dbPool = require("../../config/db");

const deleteTicket = async (ticketId) => {
  const client = await dbPool.connect();

  try {
    const result = await client.query(
      `
        DELETE FROM support_tickets
        WHERE id = $1
        RETURNING id, ticket_number, title
      `,
      [ticketId]
    );

    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

module.exports = deleteTicket;
