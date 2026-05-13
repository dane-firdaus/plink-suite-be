ALTER TABLE user_workspaces
  ADD COLUMN IF NOT EXISTS workspace_role VARCHAR(50) NOT NULL DEFAULT 'member';

CREATE TABLE IF NOT EXISTS user_workspace_privileges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id VARCHAR(50) NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  privilege_code VARCHAR(150) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, workspace_id, privilege_code)
);

CREATE INDEX IF NOT EXISTS idx_user_workspace_privileges_user_id
  ON user_workspace_privileges(user_id);

CREATE INDEX IF NOT EXISTS idx_user_workspace_privileges_workspace_id
  ON user_workspace_privileges(workspace_id);

UPDATE user_workspaces uw
SET workspace_role = CASE
  WHEN LOWER(COALESCE(r.name, '')) LIKE '%super%'
    OR LOWER(COALESCE(r.name, '')) LIKE '%admin%'
    OR LOWER(COALESCE(r.name, '')) LIKE '%director%'
    OR LOWER(COALESCE(r.name, '')) LIKE '%management%'
  THEN 'admin'
  ELSE 'member'
END
FROM users u
LEFT JOIN roles r ON u.role_id = r.role_id
WHERE uw.user_id = u.id;
