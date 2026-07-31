const models = require("../../models");

const reconDashboardTableReport = async (req, res) => {
  try {
    const snapshotDate = req.query.snapshot_date || null;
    const trxDate = req.query.trx_date || null;

    const result = await models.reconDashboardTableReport({
      snapshotDate,
      trxDate,
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

module.exports = reconDashboardTableReport;
