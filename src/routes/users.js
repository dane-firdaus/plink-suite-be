const express = require('express');
const router = express.Router();
const Joi = require("joi");
const auth = require("../middleware/auth");
const {registerController, loginController, listUsersController, listUserWorkspacesController} = require("../controller");
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



router.post('/authentications/register-user', validator.body(registerSchema), registerController);
router.post('/authentications/login', validator.body(loginSchema), loginController);

router.get('/list-users', auth, listUsersController)
router.get('/workspaces', auth, listUserWorkspacesController)

module.exports = router;
