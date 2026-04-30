const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");
const dbPool = require("../src/config/db");

const DEFAULT_ADMIN = {
  username: process.env.SEED_ADMIN_USERNAME || "admin",
  email: process.env.SEED_ADMIN_EMAIL || "admin@prismalink.local",
  password: process.env.SEED_ADMIN_PASSWORD || "Admin123!",
  fullname: process.env.SEED_ADMIN_FULLNAME || "Super Admin",
  roleId: process.env.SEED_ADMIN_ROLE_ID || "role-super-admin",
  divisionId: process.env.SEED_ADMIN_DIVISION_ID || "div-management",
  workspaceAccess: process.env.SEED_ADMIN_WORKSPACE_ACCESS || JSON.stringify(["plink-one", "plink-desk", "plink-crm"]),
  defaultWorkspace: process.env.SEED_ADMIN_DEFAULT_WORKSPACE || "plink-one",
};

const ensureDefaultAdmin = async (client) => {
  const hashedPassword = bcrypt.hashSync(DEFAULT_ADMIN.password, 10);
  const parsedWorkspaceAccess = JSON.parse(DEFAULT_ADMIN.workspaceAccess);

  await client.query(
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
      ON CONFLICT (email) DO UPDATE
      SET
        username = EXCLUDED.username,
        password = EXCLUDED.password,
        fullname = EXCLUDED.fullname,
        role_id = EXCLUDED.role_id,
        division_id = EXCLUDED.division_id,
        workspace_access = EXCLUDED.workspace_access,
        default_workspace = EXCLUDED.default_workspace,
        is_active = TRUE,
        updated_at = NOW()
    `,
    [
      uuid(),
      DEFAULT_ADMIN.username,
      DEFAULT_ADMIN.email,
      hashedPassword,
      DEFAULT_ADMIN.fullname,
      DEFAULT_ADMIN.roleId,
      DEFAULT_ADMIN.divisionId,
      JSON.stringify(parsedWorkspaceAccess),
      DEFAULT_ADMIN.defaultWorkspace,
    ]
  );

  const workspaceTableCheck = await client.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'user_workspaces'
    ) AS exists
  `);

  if (workspaceTableCheck.rows[0]?.exists) {
    await client.query(
      `
        INSERT INTO user_workspaces (user_id, workspace_id, is_default, created_at, updated_at)
        SELECT
          u.id,
          workspace_item.workspace_id,
          workspace_item.workspace_id = $2,
          NOW(),
          NOW()
        FROM users u
        CROSS JOIN LATERAL (
          SELECT jsonb_array_elements_text($3::jsonb) AS workspace_id
        ) AS workspace_item
        INNER JOIN workspaces w ON w.workspace_id = workspace_item.workspace_id
        WHERE u.email = $1
        ON CONFLICT (user_id, workspace_id) DO UPDATE
        SET
          is_default = EXCLUDED.is_default,
          updated_at = NOW()
      `,
      [
        DEFAULT_ADMIN.email,
        DEFAULT_ADMIN.defaultWorkspace,
        JSON.stringify(parsedWorkspaceAccess),
      ]
    );
  }
};

const runMigrations = async () => {
  const client = await dbPool.connect();

  try {
    const migrationsDir = path.join(__dirname, "..", "migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    for (const file of files) {
      const existing = await client.query(
        `SELECT 1 FROM schema_migrations WHERE filename = $1 LIMIT 1`,
        [file]
      );

      if (existing.rows[0]) {
        console.log(`Skipping ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        `INSERT INTO schema_migrations (filename, executed_at) VALUES ($1, NOW())`,
        [file]
      );
      await client.query("COMMIT");

      console.log(`Executed ${file}`);
    }

    console.log("Migrations completed");

    await client.query("BEGIN");
    await ensureDefaultAdmin(client);
    await client.query("COMMIT");

    console.log("Default admin ensured");
    console.log(`Admin email: ${DEFAULT_ADMIN.email}`);
    console.log(`Admin password: ${DEFAULT_ADMIN.password}`);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback failed", rollbackError);
    }
    console.error("Migration failed", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await dbPool.end();
  }
};

runMigrations();
