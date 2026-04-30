const models = require("../../models");

const getTicketDetailController = async (req, res) => {
  try {
    const ticket = await models.getTicketDetail(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ticket retrieved successfully",
      data: ticket,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve ticket detail",
    });
  }
};

module.exports = getTicketDetailController;
