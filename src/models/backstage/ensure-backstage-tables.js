const fs = require("fs");
const path = require("path");

let cachedSql = "";

const loadCreateTableSql = () => {
  if (!cachedSql) {
    cachedSql = fs.readFileSync(
      path.join(__dirname, "..", "..", "..", "migrations", "013_create_backstage_delivery_tables.sql"),
      "utf8"
    );
  }

  return cachedSql;
};

const ensureBackstageTables = async (client) => {
  await client.query(loadCreateTableSql());
};

module.exports = ensureBackstageTables;
