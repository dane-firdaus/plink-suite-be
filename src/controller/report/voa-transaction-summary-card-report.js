const models = require("../../models");

const voaTransactionSummaryCardReport = async (req, res) => {
  try {
    const metric = req.query.metric || "";

    const result = await models.voaTransactionSummaryCardReport({
      metric,
    });

    res.status(200).json({
      data: result,
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

module.exports = voaTransactionSummaryCardReport;
