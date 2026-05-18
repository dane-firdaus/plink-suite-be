const models = require("../../models");

const updateTicketOptionValueController = async (req, res) => {
  try {
    const option = await models.updateTicketOptionValue({
      optionId: req.params.optionId,
      fieldName: req.body.field_name,
      optionValue: req.body.option_value,
    });

    return res.status(200).json({
      success: true,
      message: "Ticket option value updated successfully",
      data: option,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update ticket option value",
    });
  }
};

module.exports = updateTicketOptionValueController;
