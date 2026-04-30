const dbPool = require("../../config/db");
const { getWorkspaceSchemaAvailability } = require("../../utils/workspace-schema");

const deleteUser = async ({ userId }) => {
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");

    const availability = await getWorkspaceSchemaAvailability(client);

    if (availability.hasWorkspaceTables) {
      await client.query(`DELETE FROM user_workspaces WHERE user_id = $1`, [userId]);
    }

    const result = await client.query(
      `
        DELETE FROM users
        WHERE id = $1
        RETURNING id, email, fullname
      `,
      [userId]
    );

    await client.query("COMMIT");
    return result.rows[0] || null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = deleteUser;
