const models = require("../../models");

const voaTransactionListReport = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;
    const search = req.query.search || "";

    const result = await models.voaTransactionListReport({
      page,
      limit,
      startDate,
      endDate,
      search,
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

module.exports = voaTransactionListReport;
