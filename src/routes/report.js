const express = require('express');
const router = express.Router();
const Joi = require("joi");
const auth = require("../middleware/auth");
const {
    createRolesController,
    listRolesController,
    summaryTransactionsController,
    listProductTypesController,
    productSummaryTransactionsController,
    voaMonitoringReportController,
    voaTransactionListReportController
} = require("../controller");
const validator = require("express-joi-validation").createValidator({});

const createRolesSchema = Joi.object({
    name: Joi.string().required().max(100),
});

const summaryTransactionsSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(150).default(50),
    search: Joi.string().allow("").optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    sort_field: Joi.string().valid("merchant_name", "volume_trx", "nominal_trx").default("volume_trx"),
    sort_order: Joi.string().valid("asc", "desc").default("desc"),
    sort_date: Joi.string().allow("").optional(),
    payment_type: Joi.string().allow("").optional(),
});

const productSummaryTransactionsSchema = Joi.object({
    search: Joi.string().allow("").optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    sort_field: Joi.string().valid("payment_type", "volume_trx", "nominal_trx").default("volume_trx"),
    sort_order: Joi.string().valid("asc", "desc").default("desc"),
    sort_date: Joi.string().allow("").optional(),
});

const voaMonitoringSchema = Joi.object({
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    detail_limit: Joi.number().integer().min(1).max(500).default(100),
});

const voaTransactionListSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(150).default(50),
    search: Joi.string().allow("").optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
});

router.get('/product-types', auth, listProductTypesController);

router.get(
    '/summary-data-transactions',
    auth,
    validator.query(summaryTransactionsSchema),
    summaryTransactionsController
);

router.get(
    '/product-summary-transactions',
    auth,
    validator.query(productSummaryTransactionsSchema),
    productSummaryTransactionsController
);

router.get(
    '/voa-monitoring',
    auth,
    validator.query(voaMonitoringSchema),
    voaMonitoringReportController
);

router.get(
    '/voa-transaction-list',
    auth,
    validator.query(voaTransactionListSchema),
    voaTransactionListReportController
);

module.exports = router;
