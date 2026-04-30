const express = require('express');
const router = express.Router();
const Joi = require("joi");
const {createDivisionController} = require("../controller");
const validator = require("express-joi-validation").createValidator({});

const createDivisionSchema = Joi.object({
    name: Joi.string().required().max(100),
    description: Joi.string().required().max(100),
});


router.post('/create', validator.body(createDivisionSchema), createDivisionController);


module.exports = router;