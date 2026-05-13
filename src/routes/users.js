const express = require('express');
const router = express.Router();
const Joi = require("joi");
const auth = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const {
  registerController,
  loginController,
  listUsersController,
  listUserWorkspacesController,
  createUserController,
  updateUserController,
  deleteUserController,
  listPrivilegeCatalogController,
  getCurrentUserProfileController,
  updateCurrentUserProfileController,
  changeCurrentUserPasswordController,
  forgotPasswordController,
} = require("../controller");
const validator = require("express-joi-validation").createValidator({});

const workspaceMembershipSchema = Joi.object({
    workspace_id: Joi.string().valid('plink-one', 'plink-desk', 'plink-crm', 'plink-recon', 'plink-books').required(),
    workspace_role: Joi.string().valid('admin', 'member').required(),
    privilege_codes: Joi.array().items(Joi.string().max(150)).required(),
    is_default: Joi.boolean().optional(),
});

const registerSchema = Joi.object({
    username: Joi.string().required().max(100),
    email: Joi.string().email().required().max(60),
    password: Joi.string().required().max(100),
    role_id: Joi.string().required().max(100),
    division_id: Joi.string().required().max(100),
    fullname: Joi.string().required().max(100),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required().max(60),
    password: Joi.string().required().max(100),
});

const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required().max(60),
    username: Joi.string().required().max(100),
    fullname: Joi.string().required().max(150),
    new_password: Joi.string().required().min(6).max(100),
});

const updateProfileSchema = Joi.object({
    username: Joi.string().required().max(100),
    fullname: Joi.string().required().max(150),
    division_id: Joi.string().required().max(100),
});

const changePasswordSchema = Joi.object({
    current_password: Joi.string().required().max(100),
    new_password: Joi.string().required().min(6).max(100),
});

const adminUserSchema = Joi.object({
    username: Joi.string().required().max(100),
    email: Joi.string().email().required().max(60),
    password: Joi.string().min(6).max(100),
    role_id: Joi.string().required().max(100),
    division_id: Joi.string().required().max(100),
    fullname: Joi.string().required().max(150),
    workspace_access: Joi.array().items(
      Joi.string().valid('plink-one', 'plink-desk', 'plink-crm', 'plink-recon', 'plink-books')
    ).min(1).required(),
    default_workspace: Joi.string().valid('plink-one', 'plink-desk', 'plink-crm', 'plink-recon', 'plink-books').required(),
    workspace_memberships: Joi.array().items(workspaceMembershipSchema).min(1).optional(),
});

const createUserSchema = adminUserSchema.keys({
    password: Joi.string().required().min(6).max(100),
});

const updateUserSchema = adminUserSchema.keys({
    password: Joi.string().allow('').optional(),
});



router.post('/authentications/register-user', validator.body(registerSchema), registerController);
router.post('/authentications/login', validator.body(loginSchema), loginController);
router.post('/authentications/forgot-password', validator.body(forgotPasswordSchema), forgotPasswordController);
router.post('/create', auth, authorize({ anyOf: ['plink-one.users.create'] }), validator.body(createUserSchema), createUserController);
router.put('/:userId', auth, authorize({ anyOf: ['plink-one.users.update'] }), validator.body(updateUserSchema), updateUserController);
router.delete('/:userId', auth, authorize({ anyOf: ['plink-one.users.delete'] }), deleteUserController);

router.get('/list-users', auth, authorize({ anyOf: ['plink-one.users.read'] }), listUsersController)
router.get('/workspaces', auth, listUserWorkspacesController)
router.get('/privilege-catalog', auth, authorize({ anyOf: ['plink-one.users.read', 'plink-one.roles.read'] }), listPrivilegeCatalogController)
router.get('/me', auth, getCurrentUserProfileController)
router.put('/me/profile', auth, validator.body(updateProfileSchema), updateCurrentUserProfileController)
router.put('/me/password', auth, validator.body(changePasswordSchema), changeCurrentUserPasswordController)

module.exports = router;
