const dbPool = require("../../config/db");

const listRoles = async ({ name, limit = 10, page = 1 }) => {
    const offset = (page - 1) * limit;
  
    const query = `
      SELECT 
        role_id, 
        name, 
        COUNT(*) OVER() AS total_count
      FROM roles
      WHERE COALESCE($1, '') = '' OR name ILIKE '%' || $1 || '%'
      ORDER BY role_id DESC
      LIMIT $2 OFFSET $3;
    `;
  
    const values = [name || '', limit, offset];
  
    const client = await dbPool.connect();
  
    try {
      const result = await client.query(query, values);
      const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
      const totalPage = Math.ceil(totalCount / limit);
  
      return {
        data: result.rows.map(({ total_count, ...row }) => row), // Hapus total_count dari setiap row
        pagination: {
          totalData: totalCount,
          totalPage: totalPage,
          rowPerPage: limit,
          currentPage: page,
        },
      };
    } catch (error) {
      console.error("Error fetching roles:", error);
      throw error;
    } finally {
      client.release();
    }
  };

  module.exports = listRoles