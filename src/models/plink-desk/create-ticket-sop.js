const { v4: uuid } = require("uuid");
const dbPool = require("../../config/db");

const createTicketSop = async ({ code, title, content }) => {
  const client = await dbPool.connect();

  try {
    const result = await client.query(
      `
        INSERT INTO support_ticket_sops (
          id, code, title, content, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
        RETURNING id, code, title, content, created_at, updated_at
      `,
      [uuid(), code, title, content]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
};

module.exports = createTicketSop;
