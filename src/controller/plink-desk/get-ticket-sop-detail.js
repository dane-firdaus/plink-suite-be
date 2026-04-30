const models = require("../../models");

const getTicketSopDetailController = async (req, res) => {
  try {
    const sop = await models.getTicketSopDetail(req.params.sopId);

    if (!sop) {
      return res.status(404).json({
        success: false,
        message: "SOP not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "SOP retrieved successfully",
      data: sop,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve SOP detail",
    });
  }
};

module.exports = getTicketSopDetailController;
