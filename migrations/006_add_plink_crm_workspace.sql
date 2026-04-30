INSERT INTO workspaces (workspace_id, name, description, base_path, sort_order)
VALUES
  ('plink-crm', 'Plink CRM', 'Business Development & Sales', '/plink-crm', 3)
ON CONFLICT (workspace_id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  base_path = EXCLUDED.base_path,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
