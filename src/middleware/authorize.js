const { flattenPrivilegeCodes } = require("../models/users/workspace-privileges");

const getUserPrivilegeCodes = (user) => {
  if (Array.isArray(user?.privilege_codes) && user.privilege_codes.length > 0) {
    return user.privilege_codes;
  }

  if (Array.isArray(user?.workspace_memberships)) {
    return flattenPrivilegeCodes(user.workspace_memberships);
  }

  return [];
};

const hasAnyPrivilege = (user, privilegeCodes = []) => {
  const grantedCodes = new Set(getUserPrivilegeCodes(user));
  return privilegeCodes.some((code) => grantedCodes.has(code));
};

const authorize = ({ anyOf = [] }) => (req, res, next) => {
  if (anyOf.length === 0) {
    return next();
  }

  if (hasAnyPrivilege(req.user, anyOf)) {
    return next();
  }

  return res.status(403).json({
    message: "You do not have permission to access this resource",
    status: 403,
  });
};

module.exports = {
  authorize,
  hasAnyPrivilege,
  getUserPrivilegeCodes,
};
