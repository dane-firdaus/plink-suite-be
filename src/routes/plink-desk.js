const express = require("express");
const Joi = require("joi");
const multer = require("multer");
const auth = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const {
  PLINK_DESK_PRIORITIES,
  PLINK_DESK_STATUSES,
  PLINK_DESK_CATEGORY_GROUPS,
} = require("../constants/plink-desk");
const {
  listTicketsController,
  getTicketDetailController,
  createTicketController,
  updateTicketController,
  updateTicketStatusController,
  addTicketCommentController,
  getTicketHistoryController,
  getDashboardSummaryController,
  deleteTicketController,
  listTicketCategoriesController,
  listTicketSopsController,
  listMerchantOptionsController,
  listTicketOptionValuesController,
  getTicketSopDetailController,
  createTicketSopController,
  updateTicketSopController,
  createTicketOptionValueController,
  exportTicketReportController,
  importTicketWorkbookController,
  getOnboardingSchemaController,
  listOnboardingRecordsController,
  getOnboardingRecordDetailController,
  createOnboardingRecordController,
  updateOnboardingRecordController,
  syncOnboardingRecordsController,
  exportOnboardingRecordsController,
} = require("../controller");

const router = express.Router();
const validator = require("express-joi-validation").createValidator({});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const ticketSchema = Joi.object({
  title: Joi.string().trim().max(200).required(),
  description: Joi.string().trim().allow("").required(),
  customer_name: Joi.string().trim().max(150).allow("").default(""),
  merchant_id: Joi.string().trim().max(100).allow("").default(""),
  merchant_name: Joi.string().trim().max(150).required(),
  issue_category: Joi.string().trim().max(100).allow("").default(""),
  priority: Joi.string()
    .valid(...PLINK_DESK_PRIORITIES)
    .required(),
  status: Joi.string()
    .valid(...PLINK_DESK_STATUSES)
    .required(),
  assigned_to: Joi.string().trim().max(150).allow("").default(""),
  ticket_date: Joi.date().optional(),
  channel: Joi.string().trim().max(50).required(),
  sender: Joi.string().trim().allow("").default(""),
  category_group: Joi.string()
    .valid(...PLINK_DESK_CATEGORY_GROUPS)
    .required(),
  product: Joi.string().trim().max(100).required(),
  detail_0: Joi.string().trim().max(255).required(),
  detail_1: Joi.string().trim().allow("").default(""),
  detail_2: Joi.string().trim().allow("").default(""),
  bank: Joi.string().trim().max(100).allow("").default(""),
  detail_category_code: Joi.string().trim().max(20).allow("").default(""),
  first_time_response: Joi.alternatives().try(Joi.date(), Joi.string().allow(""), Joi.valid(null)).optional(),
  note_detail: Joi.string().trim().allow("").default(""),
  handling_sop_code: Joi.string().trim().max(100).allow("").default(""),
  investigation_process: Joi.string().trim().allow("").default(""),
  activity_notes: Joi.string().trim().max(500).allow("").optional(),
});

const ticketQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow("").optional(),
  status: Joi.string()
    .valid("", ...PLINK_DESK_STATUSES)
    .optional(),
  priority: Joi.string()
    .valid("", ...PLINK_DESK_PRIORITIES)
    .optional(),
  category_code: Joi.string().allow("").optional(),
  channel: Joi.string().allow("").optional(),
  bank: Joi.string().allow("").optional(),
  product: Joi.string().allow("").optional(),
  category_group: Joi.string().allow("").optional(),
  date_from: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow("")).optional(),
  date_to: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow("")).optional(),
});

const onboardingQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(150).default(50),
  search: Joi.string().allow("").optional(),
});

const onboardingPayloadSchema = Joi.object({
  headers: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
  data: Joi.object().pattern(Joi.string(), Joi.string().allow("")).required(),
});

const merchantQuerySchema = Joi.object({
  search: Joi.string().allow("").optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

const ticketOptionValueQuerySchema = Joi.object({
  field_name: Joi.string().valid("title", "detail_1").required(),
  search: Joi.string().allow("").optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

const ticketOptionValueSchema = Joi.object({
  field_name: Joi.string().valid("title", "detail_1").required(),
  option_value: Joi.string().trim().max(255).required(),
});

const statusSchema = Joi.object({
  status: Joi.string()
    .valid(...PLINK_DESK_STATUSES)
    .required(),
  notes: Joi.string().trim().max(500).allow("").optional(),
});

const commentSchema = Joi.object({
  comment: Joi.string().trim().max(2000).required(),
});

const sopSchema = Joi.object({
  code: Joi.string().trim().max(100).required(),
  title: Joi.string().trim().max(200).required(),
  content: Joi.string().trim().required(),
});

const paramsSchema = Joi.object({
  ticketId: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required(),
});

const sopParamsSchema = Joi.object({
  sopId: Joi.string().guid().required(),
});

const onboardingParamsSchema = Joi.object({
  recordId: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required(),
});

router.get("/dashboard/summary", auth, authorize({ anyOf: ["plink-desk.dashboard.read"] }), getDashboardSummaryController);
router.get("/categories", auth, authorize({ anyOf: ["plink-desk.tickets.read"] }), listTicketCategoriesController);
router.get("/sops", auth, authorize({ anyOf: ["plink-desk.sops.read"] }), listTicketSopsController);
router.get("/merchants", auth, authorize({ anyOf: ["plink-desk.tickets.read"] }), validator.query(merchantQuerySchema), listMerchantOptionsController);
router.get(
  "/ticket-option-values",
  auth,
  authorize({ anyOf: ["plink-desk.ticket-options.read"] }),
  validator.query(ticketOptionValueQuerySchema),
  listTicketOptionValuesController
);
router.post(
  "/ticket-option-values",
  auth,
  authorize({ anyOf: ["plink-desk.ticket-options.create"] }),
  validator.body(ticketOptionValueSchema),
  createTicketOptionValueController
);
router.get("/onboarding/schema", auth, authorize({ anyOf: ["plink-desk.onboarding.read", "plink-crm.onboarding.read"] }), getOnboardingSchemaController);
router.post("/onboarding/sync", auth, authorize({ anyOf: ["plink-desk.onboarding.update", "plink-crm.onboarding.update"] }), syncOnboardingRecordsController);
router.get("/onboarding/export", auth, authorize({ anyOf: ["plink-desk.onboarding.read", "plink-crm.onboarding.read"] }), validator.query(onboardingQuerySchema), exportOnboardingRecordsController);
router.get("/onboarding", auth, authorize({ anyOf: ["plink-desk.onboarding.read", "plink-crm.onboarding.read"] }), validator.query(onboardingQuerySchema), listOnboardingRecordsController);
router.get("/onboarding/:recordId", auth, authorize({ anyOf: ["plink-desk.onboarding.read", "plink-crm.onboarding.read"] }), validator.params(onboardingParamsSchema), getOnboardingRecordDetailController);
router.post("/onboarding", auth, authorize({ anyOf: ["plink-desk.onboarding.create", "plink-crm.onboarding.create"] }), validator.body(onboardingPayloadSchema), createOnboardingRecordController);
router.put(
  "/onboarding/:recordId",
  auth,
  authorize({ anyOf: ["plink-desk.onboarding.update", "plink-crm.onboarding.update"] }),
  validator.params(onboardingParamsSchema),
  validator.body(onboardingPayloadSchema),
  updateOnboardingRecordController
);
router.post("/import", auth, authorize({ anyOf: ["plink-desk.tickets.create"] }), upload.single("file"), importTicketWorkbookController);
router.get("/sops/:sopId", auth, authorize({ anyOf: ["plink-desk.sops.read"] }), validator.params(sopParamsSchema), getTicketSopDetailController);
router.post("/sops", auth, authorize({ anyOf: ["plink-desk.sops.create"] }), validator.body(sopSchema), createTicketSopController);
router.put(
  "/sops/:sopId",
  auth,
  authorize({ anyOf: ["plink-desk.sops.update"] }),
  validator.params(sopParamsSchema),
  validator.body(sopSchema),
  updateTicketSopController
);
router.get("/export", auth, authorize({ anyOf: ["plink-desk.tickets.read"] }), validator.query(ticketQuerySchema), exportTicketReportController);
router.get("/tickets", auth, authorize({ anyOf: ["plink-desk.tickets.read"] }), validator.query(ticketQuerySchema), listTicketsController);
router.get(
  "/tickets/:ticketId",
  auth,
  authorize({ anyOf: ["plink-desk.tickets.read"] }),
  validator.params(paramsSchema),
  getTicketDetailController
);
router.post("/tickets", auth, authorize({ anyOf: ["plink-desk.tickets.create"] }), validator.body(ticketSchema), createTicketController);
router.put(
  "/tickets/:ticketId",
  auth,
  authorize({ anyOf: ["plink-desk.tickets.update"] }),
  validator.params(paramsSchema),
  validator.body(ticketSchema),
  updateTicketController
);
router.delete(
  "/tickets/:ticketId",
  auth,
  authorize({ anyOf: ["plink-desk.tickets.delete"] }),
  validator.params(paramsSchema),
  deleteTicketController
);
router.patch(
  "/tickets/:ticketId/status",
  auth,
  authorize({ anyOf: ["plink-desk.tickets.update"] }),
  validator.params(paramsSchema),
  validator.body(statusSchema),
  updateTicketStatusController
);
router.post(
  "/tickets/:ticketId/comments",
  auth,
  authorize({ anyOf: ["plink-desk.tickets.update"] }),
  validator.params(paramsSchema),
  validator.body(commentSchema),
  addTicketCommentController
);
router.get(
  "/tickets/:ticketId/history",
  auth,
  authorize({ anyOf: ["plink-desk.tickets.read"] }),
  validator.params(paramsSchema),
  getTicketHistoryController
);

module.exports = router;
