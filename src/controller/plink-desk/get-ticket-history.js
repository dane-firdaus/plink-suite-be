const models = require("../../models");

const getTicketHistoryController = async (req, res) => {
  try {
    const history = await models.getTicketHistory(req.params.ticketId);

    return res.status(200).json({
      success: true,
      message: "Ticket history retrieved successfully",
      data: history,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve ticket history",
    });
  }
};

module.exports = getTicketHistoryController;
