const models = require("../../models");

const addTicketCommentController = async (req, res) => {
  try {
    const comment = await models.addTicketComment(req.params.ticketId, {
      ...req.body,
      created_by: req.user?.email || "system",
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: comment,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to add comment",
    });
  }
};

module.exports = addTicketCommentController;
