const models = require("../../models");

const voaMonitoringSummaryCardReport = async (req, res) => {
  try {
    const metric = req.query.metric;
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;

    const result = await models.voaMonitoringReport.getSummaryCard({
      metric,
      startDate,
      endDate,
    });

    res.status(200).json({
      ...result,
      status: 200,
    });
  } catch (error) {
    console.log(error.stack);
    res.status(500).json({
      message: "Internal server error !",
      status: 500,
    });
  }
};

module.exports = voaMonitoringSummaryCardReport;
