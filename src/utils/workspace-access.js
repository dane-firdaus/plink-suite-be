const ALL_WORKSPACES = ["plink-one", "plink-desk", "plink-crm"];

const normalizeWorkspaceAccess = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) =>
      typeof item === "object" && item !== null
        ? String(item.workspace_id || item.id || "").trim().toLowerCase()
        : String(item || "").trim().toLowerCase()
    )
    .filter((item, index, array) => ALL_WORKSPACES.includes(item) && array.indexOf(item) === index);
};

const inferWorkspaceAccessFromRole = (roleName = "") => {
  const normalizedRole = String(roleName || "").toLowerCase();

  if (
    normalizedRole.includes("super") ||
    normalizedRole.includes("admin") ||
    normalizedRole.includes("director") ||
    normalizedRole.includes("management")
  ) {
    return ["plink-one", "plink-desk", "plink-crm"];
  }

  if (
    normalizedRole.includes("support") ||
    normalizedRole.includes("helpdesk") ||
    normalizedRole.includes("desk")
  ) {
    return ["plink-desk"];
  }

  if (
    normalizedRole.includes("crm") ||
    normalizedRole.includes("sales") ||
    normalizedRole.includes("business development") ||
    normalizedRole.includes("bd")
  ) {
    return ["plink-crm"];
  }

  return ["plink-one"];
};

const resolveWorkspaceAccess = (user) => {
  const normalizedFromRelations = normalizeWorkspaceAccess(user?.workspaces);

  if (normalizedFromRelations.length > 0) {
    return normalizedFromRelations;
  }

  const normalized = normalizeWorkspaceAccess(user?.workspace_access);

  if (normalized.length > 0) {
    return normalized;
  }

  return inferWorkspaceAccessFromRole(user?.role_name);
};

const resolveDefaultWorkspace = (user, workspaceAccess) => {
  const relationalDefaultWorkspace = Array.isArray(user?.workspaces)
    ? user.workspaces.find((item) => item?.is_default)?.workspace_id
    : "";
  const relationalCandidate = String(relationalDefaultWorkspace || "").trim().toLowerCase();

  if (workspaceAccess.includes(relationalCandidate)) {
    return relationalCandidate;
  }

  const candidate = String(user?.default_workspace || "").trim().toLowerCase();

  if (workspaceAccess.includes(candidate)) {
    return candidate;
  }

  return workspaceAccess[0] || "plink-one";
};

module.exports = {
  normalizeWorkspaceAccess,
  resolveWorkspaceAccess,
  resolveDefaultWorkspace,
};
