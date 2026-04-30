CREATE TABLE IF NOT EXISTS divisions (
  id SERIAL PRIMARY KEY,
  division_id VARCHAR(100),
  name VARCHAR(150),
  description TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE divisions ADD COLUMN IF NOT EXISTS division_id VARCHAR(100);
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS name VARCHAR(150);
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE divisions ALTER COLUMN description SET DEFAULT '';
ALTER TABLE divisions ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE divisions ALTER COLUMN updated_at SET DEFAULT NOW();

UPDATE divisions
SET
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW()),
  description = COALESCE(NULLIF(TRIM(description), ''), ''),
  name = COALESCE(NULLIF(TRIM(name), ''), division_id, 'General Division')
WHERE TRUE;

ALTER TABLE divisions ALTER COLUMN division_id SET NOT NULL;
ALTER TABLE divisions ALTER COLUMN name SET NOT NULL;
ALTER TABLE divisions ALTER COLUMN description SET NOT NULL;
ALTER TABLE divisions ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE divisions ALTER COLUMN updated_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  role_id VARCHAR(100),
  name VARCHAR(150),
  description TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE roles ADD COLUMN IF NOT EXISTS role_id VARCHAR(100);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS name VARCHAR(150);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE roles ALTER COLUMN description SET DEFAULT '';
ALTER TABLE roles ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE roles ALTER COLUMN updated_at SET DEFAULT NOW();

UPDATE roles
SET
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW()),
  description = COALESCE(NULLIF(TRIM(description), ''), ''),
  name = COALESCE(NULLIF(TRIM(name), ''), role_id, 'General Role')
WHERE TRUE;

ALTER TABLE roles ALTER COLUMN role_id SET NOT NULL;
ALTER TABLE roles ALTER COLUMN name SET NOT NULL;
ALTER TABLE roles ALTER COLUMN description SET NOT NULL;
ALTER TABLE roles ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE roles ALTER COLUMN updated_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS privileges (
  id SERIAL PRIMARY KEY,
  privilege_id VARCHAR(100),
  code VARCHAR(100),
  name VARCHAR(150),
  description TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE privileges ADD COLUMN IF NOT EXISTS privilege_id VARCHAR(100);
ALTER TABLE privileges ADD COLUMN IF NOT EXISTS code VARCHAR(100);
ALTER TABLE privileges ADD COLUMN IF NOT EXISTS name VARCHAR(150);
ALTER TABLE privileges ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE privileges ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE privileges ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE privileges ALTER COLUMN description SET DEFAULT '';
ALTER TABLE privileges ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE privileges ALTER COLUMN updated_at SET DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'privileges'
      AND column_name = 'privilage_id'
  ) THEN
    EXECUTE '
      UPDATE privileges
      SET privilege_id = COALESCE(privilege_id, privilage_id)
      WHERE privilege_id IS NULL
    ';
    EXECUTE '
      UPDATE privileges
      SET privilage_id = COALESCE(privilage_id, privilege_id, code, name)
      WHERE privilage_id IS NULL
    ';
    EXECUTE '
      ALTER TABLE privileges
      ALTER COLUMN privilage_id SET DEFAULT ''''
    ';
  END IF;
END $$;

UPDATE privileges
SET
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW()),
  description = COALESCE(NULLIF(TRIM(description), ''), ''),
  code = COALESCE(NULLIF(TRIM(code), ''), privilege_id, name),
  name = COALESCE(NULLIF(TRIM(name), ''), privilege_id, code, 'General Privilege')
WHERE TRUE;

ALTER TABLE privileges ALTER COLUMN privilege_id SET NOT NULL;
ALTER TABLE privileges ALTER COLUMN code SET NOT NULL;
ALTER TABLE privileges ALTER COLUMN name SET NOT NULL;
ALTER TABLE privileges ALTER COLUMN description SET NOT NULL;
ALTER TABLE privileges ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE privileges ALTER COLUMN updated_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS role_privileges (
  id SERIAL PRIMARY KEY,
  role_id INTEGER,
  privilege_id INTEGER
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid VARCHAR(100),
  username VARCHAR(100),
  email VARCHAR(60),
  password TEXT,
  fullname VARCHAR(150),
  role_id VARCHAR(100),
  division_id VARCHAR(100),
  workspace_access JSONB DEFAULT '["plink-one"]'::jsonb,
  default_workspace VARCHAR(50) DEFAULT 'plink-one',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS uid VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(60);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fullname VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS division_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_access JSONB DEFAULT '["plink-one"]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_workspace VARCHAR(50) DEFAULT 'plink-one';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ALTER COLUMN workspace_access SET DEFAULT '["plink-one"]'::jsonb;
ALTER TABLE users ALTER COLUMN default_workspace SET DEFAULT 'plink-one';
ALTER TABLE users ALTER COLUMN is_active SET DEFAULT TRUE;
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT NOW();

UPDATE users
SET
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW()),
  workspace_access = COALESCE(workspace_access, '["plink-one"]'::jsonb),
  default_workspace = COALESCE(NULLIF(TRIM(default_workspace), ''), 'plink-one'),
  is_active = COALESCE(is_active, TRUE)
WHERE TRUE;

ALTER TABLE users ALTER COLUMN uid SET NOT NULL;
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN password SET NOT NULL;
ALTER TABLE users ALTER COLUMN fullname SET NOT NULL;
ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN division_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN workspace_access SET NOT NULL;
ALTER TABLE users ALTER COLUMN default_workspace SET NOT NULL;
ALTER TABLE users ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE users ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE users ALTER COLUMN updated_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_divisions_division_id_unique ON divisions(division_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_role_id_unique ON roles(role_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_name_unique ON roles(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_privileges_privilege_id_unique ON privileges(privilege_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_privileges_code_unique ON privileges(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_uid_unique ON users(uid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_division_id ON users(division_id);

INSERT INTO divisions (division_id, name, description)
VALUES
  ('div-management', 'Management', 'Default division for management users'),
  ('div-operations', 'Operations', 'Default division for operations users'),
  ('div-sales', 'Sales', 'Default division for sales users')
ON CONFLICT (division_id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO roles (role_id, name, description)
VALUES
  ('role-super-admin', 'Super Admin', 'Full access to all workspaces and administrative features'),
  ('role-management', 'Management', 'Management access to Plink One'),
  ('role-support', 'Support', 'Operational access to Plink Desk'),
  ('role-sales', 'Sales', 'Operational access to Plink CRM')
ON CONFLICT (role_id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO privileges (privilege_id, code, name, description)
VALUES
  ('priv-dashboard-view', 'dashboard.view', 'View dashboard', 'Can access dashboard modules'),
  ('priv-users-manage', 'users.manage', 'Manage users', 'Can create and manage users'),
  ('priv-roles-manage', 'roles.manage', 'Manage roles', 'Can create and manage roles'),
  ('priv-reports-view', 'reports.view', 'View reports', 'Can access reporting modules'),
  ('priv-desk-manage', 'desk.manage', 'Manage support desk', 'Can access Plink Desk operations'),
  ('priv-crm-manage', 'crm.manage', 'Manage CRM', 'Can access Plink CRM operations')
ON CONFLICT (privilege_id) DO UPDATE
SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();
