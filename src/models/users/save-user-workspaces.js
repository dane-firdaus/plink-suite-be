const { getWorkspaceSchemaAvailability } = require("../../utils/workspace-schema");
const {
  normalizeWorkspaceMemberships,
} = require("./workspace-privileges");

const ensureUserWorkspaceState = async ({
  client,
  userId,
  roleName,
  workspaceAccess,
  defaultWorkspace,
  workspaceMemberships,
}) => {
  const normalizedMemberships = normalizeWorkspaceMemberships({
    workspaceMemberships,
    workspaceAccess,
    defaultWorkspace,
    roleName,
  });
  const safeWorkspaceAccess = normalizedMemberships.map((membership) => membership.workspace_id);
  const safeDefaultWorkspace =
    normalizedMemberships.find((membership) => membership.is_default)?.workspace_id || safeWorkspaceAccess[0] || "plink-one";

  const availability = await getWorkspaceSchemaAvailability(client);

  if (!availability.hasWorkspaceTables) {
    return {
      workspaceAccess: safeWorkspaceAccess,
      defaultWorkspace: safeDefaultWorkspace,
      workspaceMemberships: normalizedMemberships,
    };
  }

  const registeredWorkspacesResult = await client.query(
    `
      SELECT workspace_id
      FROM workspaces
      WHERE workspace_id = ANY($1::varchar[])
        AND is_active = TRUE
    `,
    [safeWorkspaceAccess]
  );

  const registeredWorkspaceIds = new Set(
    registeredWorkspacesResult.rows.map((row) => row.workspace_id)
  );
  const missingWorkspaceIds = safeWorkspaceAccess.filter(
    (workspaceId) => !registeredWorkspaceIds.has(workspaceId)
  );

  if (missingWorkspaceIds.length > 0) {
    const error = new Error(
      `Workspace is not registered or inactive: ${missingWorkspaceIds.join(", ")}`
    );
    error.statusCode = 400;
    throw error;
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
      INSERT INTO user_workspaces (
        user_id,
        workspace_id,
        is_default,
        workspace_role,
        created_at,
        updated_at
      )
      SELECT
        $1,
        workspace_item.workspace_id,
        workspace_item.workspace_id = $3,
        workspace_item.workspace_role,
        NOW(),
        NOW()
      FROM (
        SELECT
          membership.workspace_id,
          membership.workspace_role
        FROM jsonb_to_recordset($2::jsonb) AS membership(workspace_id varchar, workspace_role varchar)
      ) AS workspace_item
      INNER JOIN workspaces w
        ON w.workspace_id = workspace_item.workspace_id
       AND w.is_active = TRUE
      ON CONFLICT (user_id, workspace_id) DO UPDATE
      SET
        is_default = EXCLUDED.is_default,
        workspace_role = EXCLUDED.workspace_role,
        updated_at = NOW()
    `,
    [
      userId,
      JSON.stringify(
        normalizedMemberships.map((membership) => ({
          workspace_id: membership.workspace_id,
          workspace_role: membership.workspace_role,
        }))
      ),
      safeDefaultWorkspace,
    ]
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

  await client.query(
    `
      DELETE FROM user_workspace_privileges
      WHERE user_id = $1
    `,
    [userId]
  );

  for (const membership of normalizedMemberships) {
    if (!membership.privilege_codes.length) {
      continue;
    }

    await client.query(
      `
        INSERT INTO user_workspace_privileges (
          user_id,
          workspace_id,
          privilege_code,
          created_at,
          updated_at
        )
        SELECT
          $1,
          $2,
          privilege_item.privilege_code,
          NOW(),
          NOW()
        FROM (
          SELECT UNNEST($3::varchar[]) AS privilege_code
        ) AS privilege_item
        ON CONFLICT (user_id, workspace_id, privilege_code) DO UPDATE
        SET updated_at = NOW()
      `,
      [userId, membership.workspace_id, membership.privilege_codes]
    );
  }

  return {
    workspaceAccess: safeWorkspaceAccess,
    defaultWorkspace: safeDefaultWorkspace,
    workspaceMemberships: normalizedMemberships,
  };
};

module.exports = ensureUserWorkspaceState;
