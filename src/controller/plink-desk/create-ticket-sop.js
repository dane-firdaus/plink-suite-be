const models = require("../../models");

const createTicketSopController = async (req, res) => {
  try {
    const sop = await models.createTicketSop(req.body);

    return res.status(201).json({
      success: true,
      message: "SOP created successfully",
      data: sop,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to create SOP",
    });
  }
};

module.exports = createTicketSopController;
