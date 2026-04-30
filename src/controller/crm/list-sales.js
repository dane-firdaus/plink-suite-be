const models = require("../../models");

const listSalesController = async (req, res) => {
  try {
    const result = await models.listSales(req.query);

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to load sales list",
    });
  }
};

module.exports = listSalesController;
