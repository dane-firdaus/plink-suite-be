const BACKSTAGE_PROJECT_STATUSES = ["planning", "active", "on_hold", "completed"];
const BACKSTAGE_TASK_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "blocked",
  "done",
];
const BACKSTAGE_TASK_PRIORITIES = ["low", "medium", "high", "critical"];
const BACKSTAGE_ASSIGNEE_ROLES = ["business_analyst", "project_manager", "developer"];

module.exports = {
  BACKSTAGE_PROJECT_STATUSES,
  BACKSTAGE_TASK_STATUSES,
  BACKSTAGE_TASK_PRIORITIES,
  BACKSTAGE_ASSIGNEE_ROLES,
};
