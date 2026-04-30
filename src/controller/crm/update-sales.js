const models = require("../../models");

const updateSalesController = async (req, res) => {
  try {
    const sales = await models.updateSales({
      salesId: req.params.salesId,
      ...req.body,
      actor: req.user?.email || "system",
    });

    if (!sales) {
      return res.status(404).json({
        success: false,
        message: "Sales data not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Sales updated successfully",
      data: sales,
    });
  } catch (error) {
    console.log(error.stack);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Sales email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update sales",
    });
  }
};

module.exports = updateSalesController;
