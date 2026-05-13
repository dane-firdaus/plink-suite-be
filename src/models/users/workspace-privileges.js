const {
  WORKSPACE_ROLE_OPTIONS,
  filterPrivilegeCodesByWorkspace,
  inferPrivilegeCodesFromLegacyRole,
  inferWorkspaceRoleFromRoleName,
} = require("../../constants/access-control");
const { normalizeWorkspaceAccess, resolveDefaultWorkspace } = require("../../utils/workspace-access");

const normalizeWorkspaceMemberships = ({
  workspaceMemberships,
  workspaceAccess,
  defaultWorkspace,
  roleName,
}) => {
  if (Array.isArray(workspaceMemberships) && workspaceMemberships.length > 0) {
    const normalized = workspaceMemberships
      .map((membership) => {
        const workspaceId = String(membership?.workspace_id || "").trim().toLowerCase();
        if (!workspaceId) {
          return null;
        }

        const workspaceRole = WORKSPACE_ROLE_OPTIONS.includes(membership?.workspace_role)
          ? membership.workspace_role
          : inferWorkspaceRoleFromRoleName(roleName);

        return {
          workspace_id: workspaceId,
          workspace_role: workspaceRole,
          privilege_codes: filterPrivilegeCodesByWorkspace(workspaceId, membership?.privilege_codes || []),
          is_default: Boolean(membership?.is_default),
        };
      })
      .filter(Boolean);

    const deduplicated = normalized.filter(
      (membership, index, array) =>
        array.findIndex((item) => item.workspace_id === membership.workspace_id) === index
    );

    const normalizedWorkspaceAccess = deduplicated.map((membership) => membership.workspace_id);
    const resolvedDefaultWorkspace = resolveDefaultWorkspace(
      { default_workspace: defaultWorkspace, workspaces: deduplicated },
      normalizedWorkspaceAccess
    );

    return deduplicated.map((membership) => ({
      ...membership,
      is_default: membership.workspace_id === resolvedDefaultWorkspace,
    }));
  }

  const normalizedWorkspaceAccess = normalizeWorkspaceAccess(workspaceAccess);
  const safeWorkspaceAccess = normalizedWorkspaceAccess.length > 0 ? normalizedWorkspaceAccess : ["plink-one"];
  const safeDefaultWorkspace = resolveDefaultWorkspace(
    { default_workspace: defaultWorkspace, workspaces: safeWorkspaceAccess.map((workspaceId) => ({ workspace_id: workspaceId })) },
    safeWorkspaceAccess
  );
  const inferredPrivilegeCodes = inferPrivilegeCodesFromLegacyRole({
    roleName,
    workspaceAccess: safeWorkspaceAccess,
  });
  const inferredWorkspaceRole = inferWorkspaceRoleFromRoleName(roleName);

  return safeWorkspaceAccess.map((workspaceId) => ({
    workspace_id: workspaceId,
    workspace_role: inferredWorkspaceRole,
    privilege_codes: filterPrivilegeCodesByWorkspace(workspaceId, inferredPrivilegeCodes),
    is_default: workspaceId === safeDefaultWorkspace,
  }));
};

const resolveUserWorkspaceMemberships = (user) =>
  normalizeWorkspaceMemberships({
    workspaceMemberships: user?.workspace_memberships,
    workspaceAccess: user?.workspace_access || user?.workspaces,
    defaultWorkspace: user?.default_workspace,
    roleName: user?.role_name,
  });

const flattenPrivilegeCodes = (workspaceMemberships = []) =>
  [...new Set(workspaceMemberships.flatMap((membership) => membership.privilege_codes || []))];

module.exports = {
  normalizeWorkspaceMemberships,
  resolveUserWorkspaceMemberships,
  flattenPrivilegeCodes,
};
