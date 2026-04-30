const express = require('express');
const router = express.Router();
const Joi = require("joi");
const auth = require("../middleware/auth");
const {
  registerController,
  loginController,
  listUsersController,
  listUserWorkspacesController,
  createUserController,
  updateUserController,
  deleteUserController,
} = require("../controller");
const validator = require("express-joi-validation").createValidator({});

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

const adminUserSchema = Joi.object({
    username: Joi.string().required().max(100),
    email: Joi.string().email().required().max(60),
    password: Joi.string().min(6).max(100),
    role_id: Joi.string().required().max(100),
    division_id: Joi.string().required().max(100),
    fullname: Joi.string().required().max(150),
    workspace_access: Joi.array().items(
      Joi.string().valid('plink-one', 'plink-desk', 'plink-crm')
    ).min(1).required(),
    default_workspace: Joi.string().valid('plink-one', 'plink-desk', 'plink-crm').required(),
});

const createUserSchema = adminUserSchema.keys({
    password: Joi.string().required().min(6).max(100),
});

const updateUserSchema = adminUserSchema.keys({
    password: Joi.string().allow('').optional(),
});



router.post('/authentications/register-user', validator.body(registerSchema), registerController);
router.post('/authentications/login', validator.body(loginSchema), loginController);
router.post('/create', auth, validator.body(createUserSchema), createUserController);
router.put('/:userId', auth, validator.body(updateUserSchema), updateUserController);
router.delete('/:userId', auth, deleteUserController);

router.get('/list-users', auth, listUsersController)
router.get('/workspaces', auth, listUserWorkspacesController)

module.exports = router;
