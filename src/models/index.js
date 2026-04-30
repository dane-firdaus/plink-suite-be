const createDivisions = require("./divisions/create-division");
const getUserByEmail = require("./users/get-user-by-email");
const register = require("./users/register");
const createRoles = require("./roles/create-roles");
const listUsers = require("./users/list-users");
const listUserWorkspaces = require("./users/list-user-workspaces");
const listRoles = require("./roles/list-roles");
const updateRoles = require("./roles/update-roles");
const deleteRoles = require("./roles/delete-roles");
const summaryTransactions = require("./report/summary-transactions");
const listProductTypes = require("./report/list-product-types");
const productSummaryTransactions = require("./report/product-summary-transactions");
const listTickets = require("./plink-desk/list-tickets");
const getTicketDetail = require("./plink-desk/get-ticket-detail");
const createTicket = require("./plink-desk/create-ticket");
const updateTicket = require("./plink-desk/update-ticket");
const updateTicketStatus = require("./plink-desk/update-ticket-status");
const addTicketComment = require("./plink-desk/add-ticket-comment");
const getTicketHistory = require("./plink-desk/get-ticket-history");
const getDashboardSummary = require("./plink-desk/get-dashboard-summary");
const deleteTicket = require("./plink-desk/delete-ticket");
const listTicketCategories = require("./plink-desk/list-ticket-categories");
const listTicketSops = require("./plink-desk/list-ticket-sops");
const listMerchantOptions = require("./plink-desk/list-merchant-options");
const getTicketSopDetail = require("./plink-desk/get-ticket-sop-detail");
const createTicketSop = require("./plink-desk/create-ticket-sop");
const updateTicketSop = require("./plink-desk/update-ticket-sop");
const exportTickets = require("./plink-desk/export-tickets");
const createTicketExportWorkbook = require("./plink-desk/ticket-export-workbook");
const importTicketWorkbook = require("./plink-desk/import-ticket-workbook");
const getOnboardingSchema = require("./plink-desk/get-onboarding-schema");
const listOnboardingRecords = require("./plink-desk/list-onboarding-records");
const getOnboardingRecordDetail = require("./plink-desk/get-onboarding-record-detail");
const saveOnboardingRecord = require("./plink-desk/save-onboarding-record");
const syncOnboardingRecords = require("./plink-desk/sync-onboarding-records");
const exportOnboardingRecords = require("./plink-desk/export-onboarding-records");
const listSales = require("./crm/list-sales");
const getSalesDetail = require("./crm/get-sales-detail");
const createSales = require("./crm/create-sales");
const updateSales = require("./crm/update-sales");
const deleteSales = require("./crm/delete-sales");
module.exports = {
    createDivisions,
    getUserByEmail,
    register,
    createRoles,
    listUsers,
    listUserWorkspaces,
    updateRoles,
    listRoles,
    deleteRoles,
    summaryTransactions,
    listProductTypes,
    productSummaryTransactions,
    listTickets,
    getTicketDetail,
    createTicket,
    updateTicket,
    updateTicketStatus,
    addTicketComment,
    getTicketHistory,
    getDashboardSummary,
    deleteTicket,
    listTicketCategories,
    listTicketSops,
    listMerchantOptions,
    getTicketSopDetail,
    createTicketSop,
    updateTicketSop,
    exportTickets,
    createTicketExportWorkbook,
    importTicketWorkbook,
    getOnboardingSchema,
    listOnboardingRecords,
    getOnboardingRecordDetail,
    saveOnboardingRecord,
    syncOnboardingRecords,
    exportOnboardingRecords,
    listSales,
    getSalesDetail,
    createSales,
    updateSales,
    deleteSales
}
