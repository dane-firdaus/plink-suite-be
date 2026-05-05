const models = require("../../models");

const reconDashboardReport = async (req, res) => {
  try {
    const snapshotDate = req.query.snapshot_date || null;

    const result = await models.reconDashboardReport({
      snapshotDate,
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

module.exports = reconDashboardReport;
