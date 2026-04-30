const models = require("../../models");

const listTicketSopsController = async (req, res) => {
  try {
    const sops = await models.listTicketSops();

    return res.status(200).json({
      success: true,
      message: "SOP list retrieved successfully",
      data: sops,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve SOP list",
    });
  }
};

module.exports = listTicketSopsController;
