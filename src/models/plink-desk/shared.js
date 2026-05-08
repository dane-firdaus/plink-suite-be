const hasSupportTicketColumn = async (client, columnName) => {
  const result = await client.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'support_tickets'
          AND column_name = $1
      ) AS has_column
    `,
    [columnName]
  );

  return Boolean(result.rows[0]?.has_column);
};

const getTicketBaseSelect = async (client) => {
  const hasFirstTimeResponse = await hasSupportTicketColumn(client, "first_time_response");
  const firstTimeResponseSelect = hasFirstTimeResponse
    ? "st.first_time_response"
    : "NULL::timestamp AS first_time_response";

  return `
    SELECT
      st.id,
      st.ticket_number,
      st.title,
      st.description,
      st.customer_name,
      st.merchant_id,
      st.merchant_name,
      st.issue_category,
      st.priority,
      st.status,
      st.assigned_to,
      st.created_by,
      st.created_at,
      st.updated_at,
      st.resolved_at,
      st.ticket_date,
      st.channel,
      st.sender,
      st.category_group,
      st.product,
      st.detail_0,
      st.detail_1,
      st.detail_2,
      st.bank,
      st.detail_category_code,
      ${firstTimeResponseSelect},
      st.note_detail,
      st.handling_sop_code,
      st.investigation_process,
      st.closed_at,
      tc.group_name AS detail_category_group_name,
      tc.category_name AS detail_category_name,
      tc.short_description AS detail_category_description,
      ts.title AS handling_sop_title,
      ts.content AS handling_sop_content
    FROM support_tickets st
    LEFT JOIN support_ticket_categories tc
      ON st.detail_category_code = tc.code
    LEFT JOIN support_ticket_sops ts
      ON st.handling_sop_code = ts.code
  `;
};

module.exports = {
  getTicketBaseSelect,
  hasSupportTicketColumn,
};
