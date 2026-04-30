const dbPool = require("../../config/db");
const { TICKET_BASE_SELECT } = require("./shared");

const getTicketDetail = async (ticketId) => {
  const client = await dbPool.connect();

  try {
    const ticketResult = await client.query(
      `
        ${TICKET_BASE_SELECT}
        WHERE st.id = $1
      `,
      [ticketId]
    );

    if (!ticketResult.rows[0]) {
      return null;
    }

    const commentsResult = await client.query(
      `
        SELECT id, ticket_id, comment, created_by, created_at
        FROM support_ticket_comments
        WHERE ticket_id = $1
        ORDER BY created_at DESC
      `,
      [ticketId]
    );

    const historyResult = await client.query(
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

    return {
      ...ticketResult.rows[0],
      comments: commentsResult.rows,
      history: historyResult.rows,
    };
  } finally {
    client.release();
  }
};

module.exports = getTicketDetail;
