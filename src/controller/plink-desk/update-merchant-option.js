const models = require("../../models");

const updateMerchantOptionController = async (req, res) => {
  try {
    const merchant = await models.updateMerchantOption({
      merchantId: req.params.merchantId,
      merchantName: req.body.merchant_name,
    });

    return res.status(200).json({
      success: true,
      message: "Merchant updated successfully",
      data: merchant,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update merchant",
    });
  }
};

module.exports = updateMerchantOptionController;
