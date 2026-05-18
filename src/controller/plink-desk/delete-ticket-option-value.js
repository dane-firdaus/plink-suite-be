const models = require("../../models");

const deleteTicketOptionValueController = async (req, res) => {
  try {
    const option = await models.deleteTicketOptionValue(req.params.optionId);

    return res.status(200).json({
      success: true,
      message: "Ticket option value deleted successfully",
      data: option,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to delete ticket option value",
    });
  }
};

module.exports = deleteTicketOptionValueController;
