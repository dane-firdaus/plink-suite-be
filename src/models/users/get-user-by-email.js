const dbPool = require("../../config/db");
const { getWorkspaceSchemaAvailability } = require("../../utils/workspace-schema");

const getUserByEmail = async (email) => {
    const client = await dbPool.connect();
      try {
        const availability = await getWorkspaceSchemaAvailability(client);
        const workspaceAccessSelect = availability.hasWorkspaceAccessColumn
          ? "u.workspace_access"
          : "'[]'::jsonb AS workspace_access";
        const defaultWorkspaceSelect = availability.hasDefaultWorkspaceColumn
          ? "u.default_workspace"
          : "'plink-one' AS default_workspace";
        const workspaceRelationsJoin = availability.hasWorkspaceTables
          ? `
            LEFT JOIN LATERAL (
              SELECT json_agg(
                json_build_object(
                  'workspace_id', uw.workspace_id,
                  'is_default', uw.is_default,
                  'name', w.name,
                  'base_path', w.base_path
                )
                ORDER BY w.sort_order ASC, w.name ASC
              ) AS workspaces
              FROM user_workspaces uw
              INNER JOIN workspaces w
                ON w.workspace_id = uw.workspace_id
              WHERE uw.user_id = u.id
                AND w.is_active = TRUE
            ) AS workspace_relations ON TRUE
          `
          : "";
        const workspaceRelationsSelect = availability.hasWorkspaceTables
          ? "COALESCE(workspace_relations.workspaces, '[]'::json) AS workspaces"
          : "'[]'::json AS workspaces";
        const dbQuery = `
          SELECT
            u.*,
            ${workspaceAccessSelect},
            ${defaultWorkspaceSelect},
            r.name AS role_name,
            ${workspaceRelationsSelect}
          FROM users u
          LEFT JOIN roles r ON u.role_id = r.role_id
          ${workspaceRelationsJoin}
          WHERE u.email = $1
        `;
        const result = await client.query(dbQuery, [email]);
        return result.rows[0];
      } catch (error) {
        console.error("Error inserting division:", error);
        throw error;
      } finally {
        client.release();
      } 
}

module.exports = getUserByEmail;
