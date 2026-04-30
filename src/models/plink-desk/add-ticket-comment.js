const { v4: uuid } = require("uuid");
const dbPool = require("../../config/db");

const addTicketComment = async (ticketId, { comment, created_by }) => {
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT id FROM support_tickets WHERE id = $1`,
      [ticketId]
    );

    if (!existingResult.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    const now = new Date();

    const commentResult = await client.query(
      `
        INSERT INTO support_ticket_comments (
          id,
          ticket_id,
          comment,
          created_by,
          created_at
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [uuid(), ticketId, comment, created_by, now]
    );

    await client.query(
      `
        INSERT INTO support_ticket_activities (
          id,
          ticket_id,
          activity_type,
          old_status,
          new_status,
          notes,
          created_by,
          created_at
        )
        SELECT $1, id, $2, status, status, $3, $4, $5
        FROM support_tickets
        WHERE id = $6
      `,
      [uuid(), "comment_added", comment, created_by, now, ticketId]
    );

    await client.query("COMMIT");
    return commentResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = addTicketComment;
