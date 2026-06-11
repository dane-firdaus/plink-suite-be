const createDivisions = require("./divisions/create-division");
const getUserByEmail = require("./users/get-user-by-email");
const register = require("./users/register");
const createUser = require("./users/create-user");
const updateUser = require("./users/update-user");
const deleteUser = require("./users/delete-user");
const createRoles = require("./roles/create-roles");
const listUsers = require("./users/list-users");
const listUserWorkspaces = require("./users/list-user-workspaces");
const listPrivilegeCatalog = require("./users/list-privilege-catalog");
const getCurrentUserProfile = require("./users/get-current-user-profile");
const updateCurrentUserProfile = require("./users/update-current-user-profile");
const changeCurrentUserPassword = require("./users/change-current-user-password");
const forgotPassword = require("./users/forgot-password");
const listDivisions = require("./divisions/list-division");
const listRoles = require("./roles/list-roles");
const updateRoles = require("./roles/update-roles");
const deleteRoles = require("./roles/delete-roles");
const summaryTransactions = require("./report/summary-transactions");
const listProductTypes = require("./report/list-product-types");
const productSummaryTransactions = require("./report/product-summary-transactions");
const voaMonitoringReport = require("./report/voa-monitoring-report");
const voaTransactionListReport = require("./report/voa-transaction-list-report");
const voaTransactionSummaryCardReport = require("./report/voa-transaction-summary-card-report");
const voaTransactionSummaryReport = require("./report/voa-transaction-summary-report");
const reconDashboardReport = require("./report/recon-dashboard-report");
const financeVipotReport = require("./report/finance-vipot-report");
const financeVipotDetailReport = require("./report/finance-vipot-detail-report");
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
const updateMerchantOption = require("./plink-desk/update-merchant-option");
const deleteMerchantOption = require("./plink-desk/delete-merchant-option");
const listTicketOptionValues = require("./plink-desk/list-ticket-option-values");
const getTicketSopDetail = require("./plink-desk/get-ticket-sop-detail");
const createTicketSop = require("./plink-desk/create-ticket-sop");
const updateTicketSop = require("./plink-desk/update-ticket-sop");
const createTicketOptionValue = require("./plink-desk/create-ticket-option-value");
const updateTicketOptionValue = require("./plink-desk/update-ticket-option-value");
const deleteTicketOptionValue = require("./plink-desk/delete-ticket-option-value");
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
const {
  listProjects: listBackstageProjects,
  getProjectDetail: getBackstageProjectDetail,
  createProject: createBackstageProject,
  updateProject: updateBackstageProject,
  deleteProject: deleteBackstageProject,
} = require("./backstage/projects");
const {
  listTasks: listBackstageTasks,
  getTaskDetail: getBackstageTaskDetail,
  createTask: createBackstageTask,
  updateTask: updateBackstageTask,
  deleteTask: deleteBackstageTask,
  createTaskUpdate: createBackstageTaskUpdate,
} = require("./backstage/tasks");
const getBackstageDashboardSummary = require("./backstage/dashboard");
module.exports = {
    createDivisions,
    getUserByEmail,
    register,
    createUser,
    updateUser,
    deleteUser,
    createRoles,
    listUsers,
    listUserWorkspaces,
    listPrivilegeCatalog,
    getCurrentUserProfile,
    updateCurrentUserProfile,
    changeCurrentUserPassword,
    forgotPassword,
    listDivisions,
    updateRoles,
    listRoles,
    deleteRoles,
    summaryTransactions,
    listProductTypes,
    productSummaryTransactions,
    voaMonitoringReport,
    voaTransactionListReport,
    voaTransactionSummaryCardReport,
    voaTransactionSummaryReport,
    reconDashboardReport,
    financeVipotReport,
    financeVipotDetailReport,
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
    updateMerchantOption,
    deleteMerchantOption,
    listTicketOptionValues,
    getTicketSopDetail,
    createTicketSop,
    updateTicketSop,
    createTicketOptionValue,
    updateTicketOptionValue,
    deleteTicketOptionValue,
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
    deleteSales,
    listBackstageProjects,
    getBackstageProjectDetail,
    createBackstageProject,
    updateBackstageProject,
    deleteBackstageProject,
    listBackstageTasks,
    getBackstageTaskDetail,
    createBackstageTask,
    updateBackstageTask,
    deleteBackstageTask,
    createBackstageTaskUpdate,
    getBackstageDashboardSummary
}
