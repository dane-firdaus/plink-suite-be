const dbPool = require("../../config/db");
const updateRole = async ({ role_id, name }) => {
    const query = `UPDATE roles SET name = $1 WHERE role_id = $2 RETURNING *;`;
    const values = [name, role_id];
  
    const client = await dbPool.connect();
  
    try {
      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error("Error updating role:", error);
      throw error;
    } finally {
      client.release();
    }
  };

  module.exports = updateRole