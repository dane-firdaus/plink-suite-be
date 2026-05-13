const dbPool = require("../../config/db");
const { getWorkspaceSchemaAvailability } = require("../../utils/workspace-schema");
const { resolveUserWorkspaceMemberships, flattenPrivilegeCodes } = require("./workspace-privileges");

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
                  'workspace_role', COALESCE(uw.workspace_role, 'member'),
                  'name', w.name,
                  'base_path', w.base_path,
                  'privilege_codes', COALESCE((
                    SELECT json_agg(uwp.privilege_code ORDER BY uwp.privilege_code)
                    FROM user_workspace_privileges uwp
                    WHERE uwp.user_id = u.id
                      AND uwp.workspace_id = uw.workspace_id
                  ), '[]'::json)
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
            d.name AS division_name,
            ${workspaceRelationsSelect}
          FROM users u
          LEFT JOIN roles r ON u.role_id = r.role_id
          LEFT JOIN divisions d ON u.division_id = d.division_id
          ${workspaceRelationsJoin}
          WHERE u.email = $1
        `;
        const result = await client.query(dbQuery, [email]);
        const user = result.rows[0];

        if (!user) {
          return null;
        }

        const workspaceMemberships = resolveUserWorkspaceMemberships({
          ...user,
          workspace_memberships: Array.isArray(user.workspaces) ? user.workspaces : [],
        });

        return {
          ...user,
          workspace_memberships: workspaceMemberships,
          privilege_codes: flattenPrivilegeCodes(workspaceMemberships),
        };
      } catch (error) {
        console.error("Error inserting division:", error);
        throw error;
      } finally {
        client.release();
      } 
}

module.exports = getUserByEmail;
