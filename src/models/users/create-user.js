const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");
const dbPool = require("../../config/db");
const ensureUserWorkspaceState = require("./save-user-workspaces");

const createUser = async ({
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
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [email]
    );

    if (existingUser.rows[0]) {
      const error = new Error("email already exists");
      error.statusCode = 400;
      throw error;
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const insertedUser = await client.query(
      `
        INSERT INTO users (
          uid,
          username,
          email,
          password,
          fullname,
          role_id,
          division_id,
          workspace_access,
          default_workspace,
          is_active,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, TRUE, NOW(), NOW())
        RETURNING id
      `,
      [
        uuid(),
        username,
        email,
        hashedPassword,
        fullname,
        role_id,
        division_id,
        JSON.stringify(workspace_access || ["plink-one"]),
        default_workspace || "plink-one",
      ]
    );

    const userId = insertedUser.rows[0].id;

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

module.exports = createUser;
