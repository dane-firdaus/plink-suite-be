const models = require("../../models");

const financeVipotDetailReport = async (req, res) => {
  try {
    const rekonDate = req.query.rekon_date || null;

    const result = await models.financeVipotDetailReport({
      rekonDate,
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

module.exports = financeVipotDetailReport;
