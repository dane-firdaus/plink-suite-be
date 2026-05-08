const models = require("../../models");

const voaTransactionSummaryReport = async (_req, res) => {
  try {
    const result = await models.voaTransactionSummaryReport();

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

module.exports = voaTransactionSummaryReport;
