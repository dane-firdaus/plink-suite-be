const PLINK_DESK_PRIORITIES = ["low", "medium", "high", "critical"];
const PLINK_DESK_STATUSES = ["open", "in_progress", "pending", "resolved", "closed"];
const PLINK_DESK_ROLES = [
  "super_admin",
  "director",
  "support_admin",
  "support_agent",
  "support_viewer",
];
const PLINK_DESK_CATEGORY_GROUPS = ["Request", "Issue", "Case Fraud"];

module.exports = {
  PLINK_DESK_PRIORITIES,
  PLINK_DESK_STATUSES,
  PLINK_DESK_ROLES,
  PLINK_DESK_CATEGORY_GROUPS,
};
