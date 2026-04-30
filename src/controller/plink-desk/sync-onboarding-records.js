const models = require("../../models");

const syncOnboardingRecordsController = async (_req, res) => {
  try {
    const result = await models.syncOnboardingRecords();

    return res.status(200).json({
      success: true,
      message: "On boarding sync completed",
      data: result,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to sync onboarding records",
    });
  }
};

module.exports = syncOnboardingRecordsController;
