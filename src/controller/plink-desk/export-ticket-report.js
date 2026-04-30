const models = require("../../models");

const exportTicketReportController = async (req, res) => {
  try {
    const tickets = await models.exportTickets(req.query);
    const workbook = await models.createTicketExportWorkbook(tickets);
    const buffer = await workbook.xlsx.writeBuffer();
    const exportDate = new Date().toISOString().slice(0, 10);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Plink-Desk-Callcenter-Log-${exportDate}.xlsx"`
    );

    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to export ticket report",
    });
  }
};

module.exports = exportTicketReportController;
