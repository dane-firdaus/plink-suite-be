const models = require("../../models");

const createTicketController = async (req, res) => {
  try {
    const ticket = await models.createTicket({
      ...req.body,
      created_by: req.user?.email || "system",
    });

    res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: ticket,
    });
  } catch (error) {
    console.log(error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to create ticket",
    });
  }
};

module.exports = createTicketController;
