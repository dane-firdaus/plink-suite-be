const ensureCrmSalesTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS crm_sales (
      id UUID PRIMARY KEY,
      sales_name VARCHAR(150) NOT NULL,
      sales_email VARCHAR(150) NOT NULL UNIQUE,
      sales_phone VARCHAR(50) NOT NULL DEFAULT '',
      created_by VARCHAR(150) NOT NULL DEFAULT '',
      updated_by VARCHAR(150) NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_crm_sales_name ON crm_sales(sales_name);
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_crm_sales_email ON crm_sales(sales_email);
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_crm_sales_updated_at ON crm_sales(updated_at DESC);
  `);
};

module.exports = ensureCrmSalesTable;
