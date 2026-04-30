const fs = require("fs");
const path = require("path");
const dbPool = require("../src/config/db");

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
