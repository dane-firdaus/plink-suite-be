ALTER TABLE users
ADD COLUMN IF NOT EXISTS workspace_access JSONB NOT NULL DEFAULT '["plink-one"]'::jsonb;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS default_workspace VARCHAR(50) NOT NULL DEFAULT 'plink-one';
