const WORKSPACE_ROLE_OPTIONS = ["admin", "member"];

const PRIVILEGE_CATALOG = [
  { workspace_id: "plink-one", feature_key: "dashboard", action: "read", code: "plink-one.dashboard.read", label: "View Dashboard" },
  { workspace_id: "plink-one", feature_key: "users", action: "read", code: "plink-one.users.read", label: "View Users" },
  { workspace_id: "plink-one", feature_key: "users", action: "create", code: "plink-one.users.create", label: "Create Users" },
  { workspace_id: "plink-one", feature_key: "users", action: "update", code: "plink-one.users.update", label: "Update Users" },
  { workspace_id: "plink-one", feature_key: "users", action: "delete", code: "plink-one.users.delete", label: "Delete Users" },
  { workspace_id: "plink-one", feature_key: "roles", action: "read", code: "plink-one.roles.read", label: "View Roles" },
  { workspace_id: "plink-one", feature_key: "roles", action: "create", code: "plink-one.roles.create", label: "Create Roles" },
  { workspace_id: "plink-one", feature_key: "roles", action: "update", code: "plink-one.roles.update", label: "Update Roles" },
  { workspace_id: "plink-one", feature_key: "roles", action: "delete", code: "plink-one.roles.delete", label: "Delete Roles" },
  { workspace_id: "plink-one", feature_key: "reports", action: "read", code: "plink-one.reports.read", label: "View Reports" },

  { workspace_id: "plink-desk", feature_key: "dashboard", action: "read", code: "plink-desk.dashboard.read", label: "View Dashboard" },
  { workspace_id: "plink-desk", feature_key: "tickets", action: "read", code: "plink-desk.tickets.read", label: "View Tickets" },
  { workspace_id: "plink-desk", feature_key: "tickets", action: "create", code: "plink-desk.tickets.create", label: "Create Tickets" },
  { workspace_id: "plink-desk", feature_key: "tickets", action: "update", code: "plink-desk.tickets.update", label: "Update Tickets" },
  { workspace_id: "plink-desk", feature_key: "tickets", action: "delete", code: "plink-desk.tickets.delete", label: "Delete Tickets" },
  { workspace_id: "plink-desk", feature_key: "sops", action: "read", code: "plink-desk.sops.read", label: "View SOP" },
  { workspace_id: "plink-desk", feature_key: "sops", action: "create", code: "plink-desk.sops.create", label: "Create SOP" },
  { workspace_id: "plink-desk", feature_key: "sops", action: "update", code: "plink-desk.sops.update", label: "Update SOP" },
  { workspace_id: "plink-desk", feature_key: "sops", action: "delete", code: "plink-desk.sops.delete", label: "Delete SOP" },
  { workspace_id: "plink-desk", feature_key: "ticket-options", action: "read", code: "plink-desk.ticket-options.read", label: "View Ticket Options" },
  { workspace_id: "plink-desk", feature_key: "ticket-options", action: "create", code: "plink-desk.ticket-options.create", label: "Create Ticket Options" },
  { workspace_id: "plink-desk", feature_key: "ticket-options", action: "update", code: "plink-desk.ticket-options.update", label: "Update Ticket Options" },
  { workspace_id: "plink-desk", feature_key: "ticket-options", action: "delete", code: "plink-desk.ticket-options.delete", label: "Delete Ticket Options" },
  { workspace_id: "plink-desk", feature_key: "onboarding", action: "read", code: "plink-desk.onboarding.read", label: "View Onboarding" },
  { workspace_id: "plink-desk", feature_key: "onboarding", action: "create", code: "plink-desk.onboarding.create", label: "Create Onboarding" },
  { workspace_id: "plink-desk", feature_key: "onboarding", action: "update", code: "plink-desk.onboarding.update", label: "Update Onboarding" },
  { workspace_id: "plink-desk", feature_key: "onboarding", action: "delete", code: "plink-desk.onboarding.delete", label: "Delete Onboarding" },
  { workspace_id: "plink-desk", feature_key: "reports", action: "read", code: "plink-desk.reports.read", label: "View Reports" },

  { workspace_id: "plink-crm", feature_key: "sales", action: "read", code: "plink-crm.sales.read", label: "View Sales" },
  { workspace_id: "plink-crm", feature_key: "sales", action: "create", code: "plink-crm.sales.create", label: "Create Sales" },
  { workspace_id: "plink-crm", feature_key: "sales", action: "update", code: "plink-crm.sales.update", label: "Update Sales" },
  { workspace_id: "plink-crm", feature_key: "sales", action: "delete", code: "plink-crm.sales.delete", label: "Delete Sales" },
  { workspace_id: "plink-crm", feature_key: "onboarding", action: "read", code: "plink-crm.onboarding.read", label: "View Onboarding" },
  { workspace_id: "plink-crm", feature_key: "onboarding", action: "create", code: "plink-crm.onboarding.create", label: "Create Onboarding" },
  { workspace_id: "plink-crm", feature_key: "onboarding", action: "update", code: "plink-crm.onboarding.update", label: "Update Onboarding" },
  { workspace_id: "plink-crm", feature_key: "onboarding", action: "delete", code: "plink-crm.onboarding.delete", label: "Delete Onboarding" },

  { workspace_id: "plink-recon", feature_key: "dashboard", action: "read", code: "plink-recon.dashboard.read", label: "View Dashboard" },

  { workspace_id: "plink-books", feature_key: "settlements", action: "read", code: "plink-books.settlements.read", label: "View Settlements" },
];

const PRIVILEGE_CODE_SET = new Set(PRIVILEGE_CATALOG.map((item) => item.code));

const getPrivilegeCatalog = () => PRIVILEGE_CATALOG;

const getPrivilegeCatalogByWorkspace = () =>
  PRIVILEGE_CATALOG.reduce((accumulator, privilege) => {
    const existing = accumulator[privilege.workspace_id] || [];
    existing.push(privilege);
    accumulator[privilege.workspace_id] = existing;
    return accumulator;
  }, {});

const isValidPrivilegeCode = (code) => PRIVILEGE_CODE_SET.has(code);

const filterPrivilegeCodes = (codes = []) =>
  Array.isArray(codes)
    ? [...new Set(codes.map((item) => String(item || "").trim()).filter((item) => isValidPrivilegeCode(item)))]
    : [];

const filterPrivilegeCodesByWorkspace = (workspaceId, codes = []) =>
  filterPrivilegeCodes(codes).filter((code) => code.startsWith(`${workspaceId}.`));

const getAllPrivilegeCodesForWorkspace = (workspaceId) =>
  PRIVILEGE_CATALOG.filter((item) => item.workspace_id === workspaceId).map((item) => item.code);

const inferWorkspaceRoleFromRoleName = (roleName = "") => {
  const normalized = String(roleName || "").toLowerCase();
  if (
    normalized.includes("super") ||
    normalized.includes("admin") ||
    normalized.includes("director") ||
    normalized.includes("management")
  ) {
    return "admin";
  }

  return "member";
};

const inferPrivilegeCodesFromLegacyRole = ({ roleName = "", workspaceAccess = [] }) => {
  const normalizedRole = String(roleName || "").toLowerCase();
  const normalizedWorkspaces = Array.isArray(workspaceAccess) ? workspaceAccess : [];

  if (
    normalizedRole.includes("super") ||
    normalizedRole.includes("admin") ||
    normalizedRole.includes("director") ||
    normalizedRole.includes("management")
  ) {
    return normalizedWorkspaces.flatMap((workspaceId) => getAllPrivilegeCodesForWorkspace(workspaceId));
  }

  if (
    normalizedRole.includes("support") ||
    normalizedRole.includes("helpdesk") ||
    normalizedRole.includes("desk")
  ) {
    return getAllPrivilegeCodesForWorkspace("plink-desk");
  }

  if (
    normalizedRole.includes("crm") ||
    normalizedRole.includes("sales") ||
    normalizedRole.includes("business development") ||
    normalizedRole.includes("bd")
  ) {
    return getAllPrivilegeCodesForWorkspace("plink-crm");
  }

  if (
    normalizedRole.includes("recon") ||
    normalizedRole.includes("finance") ||
    normalizedRole.includes("settlement")
  ) {
    return [
      ...getAllPrivilegeCodesForWorkspace("plink-recon"),
      ...getAllPrivilegeCodesForWorkspace("plink-books"),
      "plink-one.reports.read",
    ];
  }

  return ["plink-one.dashboard.read"];
};

module.exports = {
  WORKSPACE_ROLE_OPTIONS,
  getPrivilegeCatalog,
  getPrivilegeCatalogByWorkspace,
  isValidPrivilegeCode,
  filterPrivilegeCodes,
  filterPrivilegeCodesByWorkspace,
  getAllPrivilegeCodesForWorkspace,
  inferWorkspaceRoleFromRoleName,
  inferPrivilegeCodesFromLegacyRole,
};
