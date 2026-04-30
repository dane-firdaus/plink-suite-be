CREATE TABLE IF NOT EXISTS workspaces (
  id SERIAL PRIMARY KEY,
  workspace_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  base_path VARCHAR(150) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_workspaces (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id VARCHAR(50) NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_user_workspaces_user_id ON user_workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_user_workspaces_workspace_id ON user_workspaces(workspace_id);

INSERT INTO workspaces (workspace_id, name, description, base_path, sort_order)
VALUES
  ('plink-one', 'Plink One', 'Direktur / Management Dashboard', '/plink-one', 1),
  ('plink-desk', 'Plink Desk', 'Support / Helpdesk', '/plink-desk', 2)
ON CONFLICT (workspace_id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  base_path = EXCLUDED.base_path,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

WITH normalized_user_workspaces AS (
  SELECT
    u.id AS user_id,
    jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(u.workspace_access) = 'array' THEN u.workspace_access
        ELSE '[]'::jsonb
      END
    ) AS workspace_id,
    COALESCE(u.default_workspace, 'plink-one') AS default_workspace
  FROM users u
)
INSERT INTO user_workspaces (user_id, workspace_id, is_default)
SELECT
  nuw.user_id,
  nuw.workspace_id,
  nuw.workspace_id = nuw.default_workspace AS is_default
FROM normalized_user_workspaces nuw
INNER JOIN workspaces w
  ON w.workspace_id = nuw.workspace_id
ON CONFLICT (user_id, workspace_id) DO UPDATE
SET
  is_default = EXCLUDED.is_default,
  updated_at = NOW();
