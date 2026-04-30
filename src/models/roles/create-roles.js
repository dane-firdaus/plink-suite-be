const dbPool = require("../../config/db");

const createRoles = async ({name, role_id}) => {
    const dbQuery = `INSERT INTO roles (name, role_id) VALUES ($1, $2) RETURNING *`;

    const client = await dbPool.connect();

  try {
    const result = await client.query(dbQuery, [name, role_id]);
    return result.rows[0];
  } catch (error) {
    console.error("Error inserting division:", error);
    throw error;
  } finally {
    client.release();
  }
    
}

module.exports = createRoles