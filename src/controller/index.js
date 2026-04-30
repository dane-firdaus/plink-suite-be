const createDivisionController = require("./divisions/create-division.js");
const createRolesController = require("./roles/create-roles.js");
const registerController = require("./users/register.js");
const createUserController = require("./users/create-user.js");
const updateUserController = require("./users/update-user.js");
const deleteUserController = require("./users/delete-user.js");
const loginController = require("./users/login.js");
const listUsersController = require("./users/list-users.js");
const listUserWorkspacesController = require("./users/list-user-workspaces.js");
const listDivisionsController = require("./divisions/list-division.js");
const listRolesController = require("./roles/list-roles.js");
const summaryTransactionsController = require("./report/summary-transaction.js");
const listProductTypesController = require("./report/list-product-types.js");
const productSummaryTransactionsController = require("./report/product-summary-transaction.js");
const voaMonitoringReportController = require("./report/voa-monitoring-report.js");
const voaTransactionListReportController = require("./report/voa-transaction-list-report.js");
const listTicketsController = require("./plink-desk/list-tickets.js");
const getTicketDetailController = require("./plink-desk/get-ticket-detail.js");
const createTicketController = require("./plink-desk/create-ticket.js");
const updateTicketController = require("./plink-desk/update-ticket.js");
const updateTicketStatusController = require("./plink-desk/update-ticket-status.js");
const addTicketCommentController = require("./plink-desk/add-ticket-comment.js");
const getTicketHistoryController = require("./plink-desk/get-ticket-history.js");
const getDashboardSummaryController = require("./plink-desk/get-dashboard-summary.js");
const deleteTicketController = require("./plink-desk/delete-ticket.js");
const listTicketCategoriesController = require("./plink-desk/list-ticket-categories.js");
const listTicketSopsController = require("./plink-desk/list-ticket-sops.js");
const listMerchantOptionsController = require("./plink-desk/list-merchant-options.js");
const getTicketSopDetailController = require("./plink-desk/get-ticket-sop-detail.js");
const createTicketSopController = require("./plink-desk/create-ticket-sop.js");
const updateTicketSopController = require("./plink-desk/update-ticket-sop.js");
const exportTicketReportController = require("./plink-desk/export-ticket-report.js");
const importTicketWorkbookController = require("./plink-desk/import-ticket-workbook.js");
const getOnboardingSchemaController = require("./plink-desk/get-onboarding-schema.js");
const listOnboardingRecordsController = require("./plink-desk/list-onboarding-records.js");
const getOnboardingRecordDetailController = require("./plink-desk/get-onboarding-record-detail.js");
const createOnboardingRecordController = require("./plink-desk/create-onboarding-record.js");
const updateOnboardingRecordController = require("./plink-desk/update-onboarding-record.js");
const syncOnboardingRecordsController = require("./plink-desk/sync-onboarding-records.js");
const exportOnboardingRecordsController = require("./plink-desk/export-onboarding-records.js");
const listSalesController = require("./crm/list-sales.js");
const getSalesDetailController = require("./crm/get-sales-detail.js");
const createSalesController = require("./crm/create-sales.js");
const updateSalesController = require("./crm/update-sales.js");
const deleteSalesController = require("./crm/delete-sales.js");

module.exports = {
    createDivisionController,
    createRolesController,
    registerController,
    createUserController,
    updateUserController,
    deleteUserController,
    loginController,
    listUsersController,
    listUserWorkspacesController,
    listDivisionsController,
    listRolesController,
    summaryTransactionsController,
    listProductTypesController,
    productSummaryTransactionsController,
    voaMonitoringReportController,
    voaTransactionListReportController,
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
    getTicketSopDetailController,
    createTicketSopController,
    updateTicketSopController,
    exportTicketReportController,
    importTicketWorkbookController,
    getOnboardingSchemaController,
    listOnboardingRecordsController,
    getOnboardingRecordDetailController,
    createOnboardingRecordController,
    updateOnboardingRecordController,
    syncOnboardingRecordsController,
    exportOnboardingRecordsController,
    listSalesController,
    getSalesDetailController,
    createSalesController,
    updateSalesController,
    deleteSalesController
}
