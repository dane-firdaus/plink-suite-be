const dbPool = require("../../config/db");
const { resolveWorkspaceAccess, resolveDefaultWorkspace } = require("../../utils/workspace-access");
const { getWorkspaceSchemaAvailability } = require("../../utils/workspace-schema");

const listUserWorkspaces = async ({ email }) => {
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
              'name', w.name,
              'base_path', w.base_path,
              'is_default', uw.is_default
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
    const result = await client.query(
      `
        SELECT
          u.id,
          u.email,
          ${workspaceAccessSelect},
          ${defaultWorkspaceSelect},
          ${workspaceRelationsSelect}
        FROM users u
        ${workspaceRelationsJoin}
        WHERE u.email = $1
        LIMIT 1
      `,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return [];
    }

    const workspaceAccess = resolveWorkspaceAccess(user);
    const defaultWorkspace = resolveDefaultWorkspace(user, workspaceAccess);
    const mappedFromRelations = Array.isArray(user.workspaces) ? user.workspaces : [];

    if (mappedFromRelations.length > 0) {
      return mappedFromRelations.map((workspace) => ({
        ...workspace,
        is_default: workspace.workspace_id === defaultWorkspace || workspace.is_default,
      }));
    }

    if (!availability.hasWorkspaceTables) {
      return workspaceAccess.map((workspaceId) => ({
        workspace_id: workspaceId,
        name: workspaceId,
        base_path: `/${workspaceId}`,
        is_default: workspaceId === defaultWorkspace,
      }));
    }

    const fallbackRows = await client.query(
      `
        SELECT workspace_id, name, base_path
        FROM workspaces
        WHERE workspace_id = ANY($1::varchar[])
          AND is_active = TRUE
        ORDER BY sort_order ASC, name ASC
      `,
      [workspaceAccess]
    );

    return fallbackRows.rows.map((workspace) => ({
      ...workspace,
      is_default: workspace.workspace_id === defaultWorkspace,
    }));
  } finally {
    client.release();
  }
};

module.exports = listUserWorkspaces;
