const TICKET_BASE_SELECT = `
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

module.exports = {
  TICKET_BASE_SELECT,
};
