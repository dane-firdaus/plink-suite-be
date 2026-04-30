const dbPool = require("../../config/db");

const listTicketCategories = async () => {
  const client = await dbPool.connect();

  try {
    const result = await client.query(`
      SELECT id, code, group_name, category_name, short_description, created_at, updated_at
      FROM support_ticket_categories
      WHERE is_active = TRUE
      ORDER BY group_name ASC, code ASC
    `);

    return result.rows;
  } finally {
    client.release();
  }
};

module.exports = listTicketCategories;
