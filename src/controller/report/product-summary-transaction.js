const models = require("../../models");

const productSummaryTransactions = async (req, res) => {
  try {
    const search = req.query.search || "";
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;
    const sortField = req.query.sort_field || "volume_trx";
    const sortOrder = req.query.sort_order || "desc";
    const sortDate = req.query.sort_date || null;

    const result = await models.productSummaryTransactions({
      search,
      startDate,
      endDate,
      sortField,
      sortOrder,
      sortDate,
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

module.exports = productSummaryTransactions;
