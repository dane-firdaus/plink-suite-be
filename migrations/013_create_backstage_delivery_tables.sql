CREATE TABLE IF NOT EXISTS backstage_projects (
  id UUID PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner_name VARCHAR(150) NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'planning',
  repo_url TEXT NOT NULL DEFAULT '',
  default_branch VARCHAR(150) NOT NULL DEFAULT '',
  target_release_date DATE NULL,
  created_by VARCHAR(150) NOT NULL DEFAULT '',
  updated_by VARCHAR(150) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backstage_projects_status
  ON backstage_projects (status);

CREATE TABLE IF NOT EXISTS backstage_tasks (
  id UUID PRIMARY KEY,
  task_no BIGSERIAL UNIQUE,
  project_id UUID NOT NULL REFERENCES backstage_projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  acceptance_criteria TEXT NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'backlog',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  assignee_name VARCHAR(150) NOT NULL DEFAULT '',
  assignee_role VARCHAR(40) NOT NULL DEFAULT 'developer',
  reporter_name VARCHAR(150) NOT NULL DEFAULT '',
  sprint_name VARCHAR(100) NOT NULL DEFAULT '',
  story_points INTEGER NOT NULL DEFAULT 0,
  effort_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  start_date DATE NULL,
  due_date DATE NULL,
  completed_at TIMESTAMP NULL,
  result_summary TEXT NOT NULL DEFAULT '',
  created_by VARCHAR(150) NOT NULL DEFAULT '',
  updated_by VARCHAR(150) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backstage_tasks_project_id
  ON backstage_tasks (project_id);

CREATE INDEX IF NOT EXISTS idx_backstage_tasks_status
  ON backstage_tasks (status);

CREATE INDEX IF NOT EXISTS idx_backstage_tasks_priority
  ON backstage_tasks (priority);

CREATE INDEX IF NOT EXISTS idx_backstage_tasks_assignee_role
  ON backstage_tasks (assignee_role);

CREATE TABLE IF NOT EXISTS backstage_task_updates (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES backstage_tasks(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  result_snapshot TEXT NOT NULL DEFAULT '',
  repo_url TEXT NOT NULL DEFAULT '',
  branch_name VARCHAR(150) NOT NULL DEFAULT '',
  commit_url TEXT NOT NULL DEFAULT '',
  pull_request_url TEXT NOT NULL DEFAULT '',
  effort_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_by VARCHAR(150) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backstage_task_updates_task_id
  ON backstage_task_updates (task_id, created_at DESC);
