const { normalizeWorkspaceAccess } = require("../../utils/workspace-access");
const { getWorkspaceSchemaAvailability } = require("../../utils/workspace-schema");

const ensureUserWorkspaceState = async ({
  client,
  userId,
  workspaceAccess,
  defaultWorkspace,
}) => {
  const normalizedWorkspaceAccess = normalizeWorkspaceAccess(workspaceAccess);
  const safeWorkspaceAccess = normalizedWorkspaceAccess.length > 0 ? normalizedWorkspaceAccess : ["plink-one"];
  const safeDefaultWorkspace = safeWorkspaceAccess.includes(defaultWorkspace)
    ? defaultWorkspace
    : safeWorkspaceAccess[0];

  const availability = await getWorkspaceSchemaAvailability(client);

  if (!availability.hasWorkspaceTables) {
    return {
      workspaceAccess: safeWorkspaceAccess,
      defaultWorkspace: safeDefaultWorkspace,
    };
  }

  await client.query(
    `
      DELETE FROM user_workspaces
      WHERE user_id = $1
        AND workspace_id <> ALL($2::varchar[])
    `,
    [userId, safeWorkspaceAccess]
  );

  await client.query(
    `
      INSERT INTO user_workspaces (user_id, workspace_id, is_default, created_at, updated_at)
      SELECT
        $1,
        workspace_item.workspace_id,
        workspace_item.workspace_id = $3,
        NOW(),
        NOW()
      FROM (
        SELECT UNNEST($2::varchar[]) AS workspace_id
      ) AS workspace_item
      INNER JOIN workspaces w
        ON w.workspace_id = workspace_item.workspace_id
       AND w.is_active = TRUE
      ON CONFLICT (user_id, workspace_id) DO UPDATE
      SET
        is_default = EXCLUDED.is_default,
        updated_at = NOW()
    `,
    [userId, safeWorkspaceAccess, safeDefaultWorkspace]
  );

  await client.query(
    `
      UPDATE user_workspaces
      SET
        is_default = workspace_id = $2,
        updated_at = NOW()
      WHERE user_id = $1
    `,
    [userId, safeDefaultWorkspace]
  );

  return {
    workspaceAccess: safeWorkspaceAccess,
    defaultWorkspace: safeDefaultWorkspace,
  };
};

module.exports = ensureUserWorkspaceState;
