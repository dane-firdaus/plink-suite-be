const models = require("../../models");

const updateTicketStatusController = async (req, res) => {
  try {
    const result = await models.updateTicketStatus(req.params.ticketId, {
      ...req.body,
      created_by: req.user?.email || "system",
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: result.unchanged
        ? "Ticket status unchanged"
        : "Ticket status updated successfully",
      data: result.ticket,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to update ticket status",
    });
  }
};

module.exports = updateTicketStatusController;
