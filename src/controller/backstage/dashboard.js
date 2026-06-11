const models = require("../../models");

const getBackstageDashboardSummaryController = async (_req, res) => {
  try {
    const data = await models.getBackstageDashboardSummary();
    return res.status(200).json({
      success: true,
      message: "Backstage dashboard loaded successfully",
      data,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to load backstage dashboard",
    });
  }
};

module.exports = {
  getBackstageDashboardSummaryController,
};
