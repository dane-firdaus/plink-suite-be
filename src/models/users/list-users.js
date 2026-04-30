const dbPool = require("../../config/db");
const { getWorkspaceSchemaAvailability } = require("../../utils/workspace-schema");

const listUsers = async ({ email, name, limit = 10, page = 1 }) => {
  const offset = (page - 1) * limit;
  const values = [email || '', name || '', limit, offset];

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
    const query = `
      SELECT 
        u.id,
        u.fullname,
        u.username,
        u.email,
        u.uid,
        u.role_id,
        u.division_id,
        u.created_at,
        u.updated_at,
        ${workspaceAccessSelect},
        ${defaultWorkspaceSelect},
        ${workspaceRelationsSelect},
        r.name as role_name,
        d.name as division_name,
        COUNT(*) OVER() AS total_count
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN divisions d ON u.division_id = d.division_id
      ${workspaceRelationsJoin}
      WHERE 
        (COALESCE($1, '') = '' OR u.email ILIKE '%' || $1 || '%') 
        AND (COALESCE($2, '') = '' OR u.fullname ILIKE '%' || $2 || '%') 
      ORDER BY u.id DESC
      LIMIT $3 OFFSET $4;
    `;
    const result = await client.query(query, values);

    // Jika data kosong, total_count harus 0
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
    console.error("Error fetching users:", error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = listUsers;
