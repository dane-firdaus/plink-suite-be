const express = require('express');
const router = express.Router();
const Joi = require("joi");
const auth = require("../middleware/auth");
const {createRolesController, listRolesController} = require("../controller");
const validator = require("express-joi-validation").createValidator({});

const createRolesSchema = Joi.object({
    name: Joi.string().required().max(100),
});


router.post('/create', validator.body(createRolesSchema), createRolesController);

router.get('/list-roles', auth, listRolesController);

module.exports = router;