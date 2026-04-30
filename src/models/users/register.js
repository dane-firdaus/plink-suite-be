const dbPool = require('../../config/db');

const register = async ({username, email, password, role_id, division_id, fullname, uid, created_at, updated_at}) => {
    const dbQuery = `INSERT INTO users (username, email, password, role_id, division_id, fullname, uid, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
    const client = await dbPool.connect();

  try {
    const result = await client.query(dbQuery, [username, email, password, role_id, division_id, fullname, uid, created_at, updated_at]);
    return result.rows[0];
  } catch (error) {
    console.error("Error inserting division:", error);
    throw error;
  } finally {
    client.release();
  }   
}

module.exports = register;