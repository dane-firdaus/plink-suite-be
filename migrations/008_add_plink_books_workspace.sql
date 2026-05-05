INSERT INTO workspaces (workspace_id, name, description, base_path, sort_order)
VALUES
  ('plink-books', 'Plink-Books', 'Finance Workspace for VIPOT Reporting', '/plink-books', 5)
ON CONFLICT (workspace_id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  base_path = EXCLUDED.base_path,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
