const models = require("../../models");

const updateOnboardingRecordController = async (req, res) => {
  try {
    const existingRecord = await models.getOnboardingRecordDetail(req.params.recordId);

    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        message: "On boarding record not found",
      });
    }

    const record = await models.saveOnboardingRecord({
      recordId: req.params.recordId,
      headers: req.body.headers,
      data: req.body.data,
      userEmail: req.user?.email || "system",
    });

    return res.status(200).json({
      success: true,
      message: "On boarding record updated successfully",
      data: record,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to update onboarding record",
    });
  }
};

module.exports = updateOnboardingRecordController;
