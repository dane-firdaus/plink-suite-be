const dbPool = require("../../config/db");
const deleteRole = async (role_id) => {
    const query = `DELETE FROM roles WHERE role_id = $1 RETURNING *;`;
    const values = [role_id];
  
    const client = await dbPool.connect();
  
    try {
      const result = await client.query(query, values);
      return result.rowCount > 0; // True jika berhasil dihapus
    } catch (error) {
      console.error("Error deleting role:", error);
      throw error;
    } finally {
      client.release();
    }
  };

  module.exports = deleteRole