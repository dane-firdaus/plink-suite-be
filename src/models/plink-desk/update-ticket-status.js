const { v4: uuid } = require("uuid");
const dbPool = require("../../config/db");

const updateTicketStatus = async (ticketId, { status, notes, created_by }) => {
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT * FROM support_tickets WHERE id = $1`,
      [ticketId]
    );

    const existing = existingResult.rows[0];

    if (!existing) {
      await client.query("ROLLBACK");
      return null;
    }

    if (existing.status === status) {
      await client.query("ROLLBACK");
      return {
        unchanged: true,
        ticket: existing,
      };
    }

    const now = new Date();
    const resolvedAt = ["resolved", "closed"].includes(status)
      ? now
      : null;

    const ticketResult = await client.query(
      `
        UPDATE support_tickets
        SET status = $2, updated_at = $3, resolved_at = $4, closed_at = $5
        WHERE id = $1
        RETURNING *
      `,
      [ticketId, status, now, resolvedAt, status === "closed" ? now : null]
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        uuid(),
        ticketId,
        "status_changed",
        existing.status,
        status,
        notes || "Ticket status updated",
        created_by,
        now,
      ]
    );

    await client.query("COMMIT");
    return {
      unchanged: false,
      ticket: ticketResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = updateTicketStatus;
