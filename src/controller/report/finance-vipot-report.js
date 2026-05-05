const models = require("../../models");

const financeVipotReport = async (req, res) => {
  try {
    const transactionDate = req.query.transaction_date || null;

    const result = await models.financeVipotReport({
      transactionDate,
    });

    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });

    res.status(200).json({
      ...result,
      requested_transaction_date: transactionDate,
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

module.exports = financeVipotReport;
