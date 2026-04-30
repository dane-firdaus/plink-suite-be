const models = require("../../models");

const getSalesDetailController = async (req, res) => {
  try {
    const sales = await models.getSalesDetail(req.params.salesId);

    if (!sales) {
      return res.status(404).json({
        success: false,
        message: "Sales data not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: sales,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to load sales detail",
    });
  }
};

module.exports = getSalesDetailController;
