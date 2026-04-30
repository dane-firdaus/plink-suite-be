const models = require("../../models");

const deleteTicketController = async (req, res) => {
  try {
    const ticket = await models.deleteTicket(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ticket deleted successfully",
      data: ticket,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to delete ticket",
    });
  }
};

module.exports = deleteTicketController;
