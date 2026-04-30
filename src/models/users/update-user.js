const bcrypt = require("bcryptjs");
const dbPool = require("../../config/db");
const ensureUserWorkspaceState = require("./save-user-workspaces");

const updateUser = async ({
  userId,
  username,
  email,
  password,
  role_id,
  division_id,
  fullname,
  workspace_access,
  default_workspace,
}) => {
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");

    const existingUser = await client.query(
      `
        SELECT id, email
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );

    if (!existingUser.rows[0]) {
      const error = new Error("user not found");
      error.statusCode = 404;
      throw error;
    }

    const duplicateEmail = await client.query(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER($1)
          AND id <> $2
        LIMIT 1
      `,
      [email, userId]
    );

    if (duplicateEmail.rows[0]) {
      const error = new Error("email already exists");
      error.statusCode = 400;
      throw error;
    }

    let passwordClause = "";
    const queryValues = [userId, username, email, fullname, role_id, division_id];

    if (password) {
      passwordClause = ", password = $7";
      queryValues.push(bcrypt.hashSync(password, 10));
    }

    await client.query(
      `
        UPDATE users
        SET
          username = $2,
          email = $3,
          fullname = $4,
          role_id = $5,
          division_id = $6
          ${passwordClause},
          updated_at = NOW()
        WHERE id = $1
      `,
      queryValues
    );

    const workspaceState = await ensureUserWorkspaceState({
      client,
      userId,
      workspaceAccess: workspace_access,
      defaultWorkspace: default_workspace,
    });

    const result = await client.query(
      `
        UPDATE users
        SET
          workspace_access = $2::jsonb,
          default_workspace = $3,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, uid, username, email, fullname, role_id, division_id, workspace_access, default_workspace, is_active, created_at, updated_at
      `,
      [userId, JSON.stringify(workspaceState.workspaceAccess), workspaceState.defaultWorkspace]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = updateUser;
