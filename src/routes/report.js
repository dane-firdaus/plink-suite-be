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
    voaTransactionListReportController,
    voaTransactionSummaryCardReportController,
    voaTransactionSummaryReportController,
    reconDashboardReportController,
    financeVipotReportController,
    financeVipotDetailReportController
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
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    transaction_date: Joi.string().allow("").optional(),
    cutoffdate: Joi.string().allow("").optional(),
    payment_method: Joi.string().allow("").optional(),
    terminal: Joi.string().allow("").optional(),
    ecomm_ref_no: Joi.string().allow("").optional(),
    bank_ref_no: Joi.string().allow("").optional(),
    merc_ref_no: Joi.string().allow("").optional(),
    billing_id: Joi.string().allow("").optional(),
    ntb: Joi.string().allow("").optional(),
    ntpn: Joi.string().allow("").optional(),
    card_type: Joi.string().allow("").optional(),
    card_no: Joi.string().allow("").optional(),
    amount: Joi.string().allow("").optional(),
    net_amount: Joi.string().allow("").optional(),
    payment_status: Joi.string().allow("").optional(),
    status_indikator: Joi.string().allow("").optional(),
});

const voaTransactionSummaryCardSchema = Joi.object({
    metric: Joi.string().valid('total_transactions', 'matched_success', 'potential_refund', 'refunded').required(),
});

const reconDashboardSchema = Joi.object({
    snapshot_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const financeVipotSchema = Joi.object({
    transaction_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const financeVipotDetailSchema = Joi.object({
    rekon_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
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

router.get(
    '/voa-transaction-list-summary-card',
    auth,
    validator.query(voaTransactionSummaryCardSchema),
    voaTransactionSummaryCardReportController
);

router.get(
    '/voa-transaction-list-summary',
    auth,
    voaTransactionSummaryReportController
);

router.get(
    '/recon-dashboard',
    auth,
    validator.query(reconDashboardSchema),
    reconDashboardReportController
);

router.get(
    '/finance-vipot',
    auth,
    validator.query(financeVipotSchema),
    financeVipotReportController
);

router.get(
    '/finance-vipot-detail',
    auth,
    validator.query(financeVipotDetailSchema),
    financeVipotDetailReportController
);

module.exports = router;
