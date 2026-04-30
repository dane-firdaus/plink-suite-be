const getWorkspaceSchemaAvailability = async (client) => {
  const tableResult = await client.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('workspaces', 'user_workspaces')
    `
  );

  const columnResult = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name IN ('workspace_access', 'default_workspace')
    `
  );

  const availableTables = new Set(tableResult.rows.map((row) => row.table_name));
  const availableColumns = new Set(columnResult.rows.map((row) => row.column_name));

  return {
    hasWorkspaceTables:
      availableTables.has("workspaces") && availableTables.has("user_workspaces"),
    hasWorkspaceAccessColumn: availableColumns.has("workspace_access"),
    hasDefaultWorkspaceColumn: availableColumns.has("default_workspace"),
  };
};

module.exports = {
  getWorkspaceSchemaAvailability,
};
