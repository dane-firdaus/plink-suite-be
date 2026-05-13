const express = require('express');
const router = express.Router();
const Joi = require("joi");
const auth = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const {createRolesController, listRolesController} = require("../controller");
const validator = require("express-joi-validation").createValidator({});

const createRolesSchema = Joi.object({
    name: Joi.string().required().max(100),
});


router.post('/create', auth, authorize({ anyOf: ['plink-one.roles.create'] }), validator.body(createRolesSchema), createRolesController);

router.get('/list-roles', auth, authorize({ anyOf: ['plink-one.roles.read'] }), listRolesController);

module.exports = router;
