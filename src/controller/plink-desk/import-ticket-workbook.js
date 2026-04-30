const models = require("../../models");

const importTicketWorkbookController = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required",
      });
    }

    const result = await models.importTicketWorkbook({
      buffer: req.file.buffer,
      createdBy: req.user?.email || "system",
    });

    return res.status(200).json({
      success: true,
      message: "Ticket workbook imported successfully",
      data: result,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to import ticket workbook",
    });
  }
};

module.exports = importTicketWorkbookController;
