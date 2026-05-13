const express = require("express");
const Joi = require("joi");
const auth = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
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

router.get("/sales", auth, authorize({ anyOf: ["plink-crm.sales.read"] }), validator.query(salesQuerySchema), listSalesController);
router.get("/sales/:salesId", auth, authorize({ anyOf: ["plink-crm.sales.read"] }), validator.params(salesParamsSchema), getSalesDetailController);
router.post("/sales", auth, authorize({ anyOf: ["plink-crm.sales.create"] }), validator.body(salesPayloadSchema), createSalesController);
router.put(
  "/sales/:salesId",
  auth,
  authorize({ anyOf: ["plink-crm.sales.update"] }),
  validator.params(salesParamsSchema),
  validator.body(salesPayloadSchema),
  updateSalesController
);
router.delete("/sales/:salesId", auth, authorize({ anyOf: ["plink-crm.sales.delete"] }), validator.params(salesParamsSchema), deleteSalesController);

module.exports = router;
