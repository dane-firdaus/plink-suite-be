const models = require("../../models");

const createTicketOptionValueController = async (req, res) => {
  try {
    const option = await models.createTicketOptionValue({
      fieldName: req.body.field_name,
      optionValue: req.body.option_value,
    });

    return res.status(201).json({
      success: true,
      message: "Ticket option value created successfully",
      data: option,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to create ticket option value",
    });
  }
};

module.exports = createTicketOptionValueController;
