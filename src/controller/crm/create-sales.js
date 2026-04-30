const models = require("../../models");

const createSalesController = async (req, res) => {
  try {
    const sales = await models.createSales({
      ...req.body,
      actor: req.user?.email || "system",
    });

    return res.status(201).json({
      success: true,
      message: "Sales created successfully",
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
      message: "Failed to create sales",
    });
  }
};

module.exports = createSalesController;
