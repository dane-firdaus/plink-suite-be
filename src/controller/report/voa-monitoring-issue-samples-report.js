const models = require("../../models");

const voaMonitoringIssueSamplesReport = async (req, res) => {
  try {
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;
    const detailLimit = Number(req.query.detail_limit) || 25;

    const result = await models.voaMonitoringReport.getIssueSamples({
      startDate,
      endDate,
      detailLimit,
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

module.exports = voaMonitoringIssueSamplesReport;
