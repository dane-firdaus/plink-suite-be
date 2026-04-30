const models = require("../../models");

const getOnboardingRecordDetailController = async (req, res) => {
  try {
    const record = await models.getOnboardingRecordDetail(req.params.recordId);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "On boarding record not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to load onboarding record",
    });
  }
};

module.exports = getOnboardingRecordDetailController;
