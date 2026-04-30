const models = require("../../models");

const createOnboardingRecordController = async (req, res) => {
  try {
    const record = await models.saveOnboardingRecord({
      headers: req.body.headers,
      data: req.body.data,
      userEmail: req.user?.email || req.body.created_by || "system",
    });

    return res.status(201).json({
      success: true,
      message: "On boarding record created successfully",
      data: record,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to create onboarding record",
    });
  }
};

module.exports = createOnboardingRecordController;
