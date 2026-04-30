const models = require("../../models");

const getDashboardSummaryController = async (req, res) => {
  try {
    const summary = await models.getDashboardSummary();

    return res.status(200).json({
      success: true,
      message: "Dashboard summary retrieved successfully",
      data: summary,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve dashboard summary",
    });
  }
};

module.exports = getDashboardSummaryController;
