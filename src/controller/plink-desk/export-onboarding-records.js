const models = require("../../models");

const exportOnboardingRecordsController = async (req, res) => {
  try {
    const buffer = await models.exportOnboardingRecords(req.query);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="plink-desk-onboarding-export.xlsx"`
    );

    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to export onboarding records",
    });
  }
};

module.exports = exportOnboardingRecordsController;
