const models = require("../../models");

const getOnboardingSchemaController = async (_req, res) => {
  try {
    const schema = await models.getOnboardingSchema();

    return res.status(200).json({
      success: true,
      data: schema,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to load onboarding schema",
    });
  }
};

module.exports = getOnboardingSchemaController;
