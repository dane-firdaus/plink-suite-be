const models = require("../../models");

const deleteSalesController = async (req, res) => {
  try {
    const sales = await models.deleteSales(req.params.salesId);

    if (!sales) {
      return res.status(404).json({
        success: false,
        message: "Sales data not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Sales deleted successfully",
      data: sales,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to delete sales",
    });
  }
};

module.exports = deleteSalesController;
