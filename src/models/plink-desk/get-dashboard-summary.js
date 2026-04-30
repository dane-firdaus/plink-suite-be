const dbPool = require("../../config/db");

const getDashboardSummary = async () => {
  const client = await dbPool.connect();

  try {
    const result = await client.query(`
      SELECT
        COUNT(*)::int AS total_ticket,
        COUNT(*) FILTER (WHERE status = 'open')::int AS open_ticket,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress_ticket,
        COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved_ticket,
        COUNT(*) FILTER (WHERE status = 'closed')::int AS closed_ticket,
        COUNT(*) FILTER (WHERE priority IN ('high', 'critical'))::int AS high_priority_ticket
      FROM support_tickets
    `);

    return result.rows[0];
  } finally {
    client.release();
  }
};

module.exports = getDashboardSummary;
