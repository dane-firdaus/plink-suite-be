const models = require("../../models");

const updateTicketSopController = async (req, res) => {
  try {
    const sop = await models.updateTicketSop(req.params.sopId, req.body);

    if (!sop) {
      return res.status(404).json({
        success: false,
        message: "SOP not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "SOP updated successfully",
      data: sop,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to update SOP",
    });
  }
};

module.exports = updateTicketSopController;
