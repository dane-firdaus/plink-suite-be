const { v4: uuid } = require("uuid");
const dbPool = require("../../config/db");

const createTicket = async (payload) => {
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");

    const sequenceResult = await client.query(
      `
        SELECT COUNT(*)::int AS total
        FROM support_tickets
        WHERE DATE(created_at) = CURRENT_DATE
      `
    );

    const sequence = String(sequenceResult.rows[0].total + 1).padStart(4, "0");
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const ticketNumber = `PD-${today}-${sequence}`;
    const ticketId = uuid();
    const now = new Date();
    const resolvedAt =
      payload.status === "resolved" || payload.status === "closed" ? now : null;

    const ticketResult = await client.query(
      `
        INSERT INTO support_tickets (
          id,
          ticket_number,
          title,
          description,
          customer_name,
          merchant_id,
          merchant_name,
          issue_category,
          priority,
          status,
          assigned_to,
          created_by,
          created_at,
          updated_at,
          resolved_at,
          ticket_date,
          channel,
          sender,
          category_group,
          product,
          detail_0,
          detail_1,
          detail_2,
          bank,
          detail_category_code,
          note_detail,
          handling_sop_code,
          investigation_process,
          closed_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
        )
        RETURNING *
      `,
      [
        ticketId,
        ticketNumber,
        payload.title,
        payload.description,
        payload.customer_name,
        payload.merchant_id,
        payload.merchant_name,
        payload.issue_category,
        payload.priority,
        payload.status,
        payload.assigned_to,
        payload.created_by,
        now,
        now,
        resolvedAt,
        payload.ticket_date || now,
        payload.channel,
        payload.sender,
        payload.category_group,
        payload.product,
        payload.detail_0,
        payload.detail_1,
        payload.detail_2,
        payload.bank,
        payload.detail_category_code,
        payload.note_detail,
        payload.handling_sop_code,
        payload.investigation_process,
        payload.status === "closed" ? now : null,
      ]
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
        "created",
        null,
        payload.status,
        payload.activity_notes || "Ticket created",
        payload.created_by,
        now,
      ]
    );

    await client.query("COMMIT");
    return ticketResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = createTicket;
