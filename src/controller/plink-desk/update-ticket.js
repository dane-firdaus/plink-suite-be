const models = require("../../models");

const updateTicketController = async (req, res) => {
  try {
    const ticket = await models.updateTicket(req.params.ticketId, {
      ...req.body,
      updated_by: req.user?.email || "system",
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ticket updated successfully",
      data: ticket,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to update ticket",
    });
  }
};

module.exports = updateTicketController;
