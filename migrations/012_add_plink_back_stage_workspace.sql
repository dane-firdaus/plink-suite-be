INSERT INTO workspaces (workspace_id, name, description, base_path, sort_order)
VALUES
  (
    'plink-back-stage',
    'Plink Back Stage',
    'Delivery workspace for Business Analyst, Project Manager, and Developer collaboration',
    '/plink-back-stage',
    6
  )
ON CONFLICT (workspace_id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  base_path = EXCLUDED.base_path,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
