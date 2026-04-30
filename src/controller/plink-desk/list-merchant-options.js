const models = require("../../models");

const listMerchantOptionsController = async (req, res) => {
  try {
    const { search = "", limit = 20 } = req.query;
    const merchants = await models.listMerchantOptions({ search, limit });

    return res.status(200).json({
      success: true,
      message: "Merchant options retrieved successfully",
      data: merchants,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve merchant options",
    });
  }
};

module.exports = listMerchantOptionsController;
