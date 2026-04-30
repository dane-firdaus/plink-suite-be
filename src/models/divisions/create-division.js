const dbPool = require("../../config/db");

const createDivisions = async ({ name, description, division_id, created_at, updated_at }) => {
  const dbQuery = `INSERT INTO divisions (name, description, division_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING *`;

  const client = await dbPool.connect();

  try {
    const result = await client.query(dbQuery, [name, description, division_id, created_at, updated_at]);
    return result.rows[0];
  } catch (error) {
    console.error("Error inserting division:", error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = createDivisions;
