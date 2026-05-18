const models = require("../../models");

const deleteMerchantOptionController = async (req, res) => {
  try {
    const merchant = await models.deleteMerchantOption(req.params.merchantId);

    return res.status(200).json({
      success: true,
      message: "Merchant deleted successfully",
      data: merchant,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to delete merchant",
    });
  }
};

module.exports = deleteMerchantOptionController;
