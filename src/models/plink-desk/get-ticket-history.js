const dbPool = require("../../config/db");

const getTicketHistory = async (ticketId) => {
  const client = await dbPool.connect();

  try {
    const result = await client.query(
      `
        SELECT
          id,
          ticket_id,
          activity_type,
          old_status,
          new_status,
          notes,
          created_by,
          created_at
        FROM support_ticket_activities
        WHERE ticket_id = $1
        ORDER BY created_at DESC
      `,
      [ticketId]
    );

    return result.rows;
  } finally {
    client.release();
  }
};

module.exports = getTicketHistory;
