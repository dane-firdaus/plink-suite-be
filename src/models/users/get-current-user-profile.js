const getUserByEmail = require("./get-user-by-email");

const getCurrentUserProfile = async ({ email }) => {
  const user = await getUserByEmail(email);

  if (!user) {
    const error = new Error("user not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    id: user.id,
    uid: user.uid,
    email: user.email,
    username: user.username,
    fullname: user.fullname,
    role_id: user.role_id,
    role_name: user.role_name,
    division_id: user.division_id,
    division_name: user.division_name,
    workspace_access: user.workspace_access,
    default_workspace: user.default_workspace,
    workspace_memberships: user.workspace_memberships || [],
    privilege_codes: user.privilege_codes || [],
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
};

module.exports = getCurrentUserProfile;
