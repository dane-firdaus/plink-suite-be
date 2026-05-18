const { v4: uuid } = require("uuid");
const dbPool = require("../../config/db");
const { hasSupportTicketColumn } = require("./shared");
const assertTicketOptionValues = require("./assert-ticket-option-values");

const updateTicket = async (ticketId, payload) => {
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

    const nextStatus = payload.status || existing.status;
    const now = new Date();
    const shouldSetResolvedAt =
      (nextStatus === "resolved" || nextStatus === "closed") && !existing.resolved_at;
    const shouldClearResolvedAt =
      existing.resolved_at && !["resolved", "closed"].includes(nextStatus);
    const hasFirstTimeResponse = await hasSupportTicketColumn(client, "first_time_response");
    const firstTimeResponseSet = hasFirstTimeResponse
      ? "first_time_response = $23,"
      : "";

    await assertTicketOptionValues(client, payload);

    const updatedResult = await client.query(
      `
        UPDATE support_tickets
        SET
          title = $2,
          description = $3,
          customer_name = $4,
          merchant_id = $5,
          merchant_name = $6,
          issue_category = $7,
          priority = $8,
          status = $9,
          assigned_to = $10,
          updated_at = $11,
          resolved_at = $12,
          ticket_date = $13,
          channel = $14,
          sender = $15,
          category_group = $16,
          product = $17,
          detail_0 = $18,
          detail_1 = $19,
          detail_2 = $20,
          bank = $21,
          detail_category_code = $22,
          ${firstTimeResponseSet}
          note_detail = $24,
          handling_sop_code = $25,
          investigation_process = $26,
          closed_at = $27
        WHERE id = $1
        RETURNING *
      `,
      [
        ticketId,
        payload.title,
        payload.description,
        payload.customer_name,
        payload.merchant_id,
        payload.merchant_name,
        payload.issue_category,
        payload.priority,
        nextStatus,
        payload.assigned_to,
        now,
        shouldSetResolvedAt ? now : shouldClearResolvedAt ? null : existing.resolved_at,
        payload.ticket_date || existing.ticket_date,
        payload.channel,
        payload.sender,
        payload.category_group,
        payload.product,
        payload.detail_0,
        payload.detail_1,
        payload.detail_2,
        payload.bank,
        payload.detail_category_code,
        payload.first_time_response || null,
        payload.note_detail,
        payload.handling_sop_code,
        payload.investigation_process,
        nextStatus === "closed" ? now : nextStatus === "resolved" ? existing.closed_at : null,
      ]
    );

    if (existing.status !== nextStatus) {
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
          nextStatus,
          payload.activity_notes || "Ticket updated",
          payload.updated_by,
          now,
        ]
      );
    }

    await client.query("COMMIT");
    return updatedResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = updateTicket;
