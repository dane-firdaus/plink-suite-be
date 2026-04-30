const express = require("express");
const Joi = require("joi");
const auth = require("../middleware/auth");
const validator = require("express-joi-validation").createValidator({});
const {
  listSalesController,
  getSalesDetailController,
  createSalesController,
  updateSalesController,
  deleteSalesController,
} = require("../controller");

const router = express.Router();

const salesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(150).default(50),
  search: Joi.string().allow("").optional(),
});

const salesPayloadSchema = Joi.object({
  sales_name: Joi.string().trim().max(150).required(),
  sales_email: Joi.string().trim().email().max(150).required(),
  sales_phone: Joi.string().trim().max(50).allow("").default(""),
});

const salesParamsSchema = Joi.object({
  salesId: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required(),
});

router.get("/sales", auth, validator.query(salesQuerySchema), listSalesController);
router.get("/sales/:salesId", auth, validator.params(salesParamsSchema), getSalesDetailController);
router.post("/sales", auth, validator.body(salesPayloadSchema), createSalesController);
router.put(
  "/sales/:salesId",
  auth,
  validator.params(salesParamsSchema),
  validator.body(salesPayloadSchema),
  updateSalesController
);
router.delete("/sales/:salesId", auth, validator.params(salesParamsSchema), deleteSalesController);

module.exports = router;
