const models = require("../../models");

const listTicketCategoriesController = async (req, res) => {
  try {
    const categories = await models.listTicketCategories();

    return res.status(200).json({
      success: true,
      message: "Ticket categories retrieved successfully",
      data: categories,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve ticket categories",
    });
  }
};

module.exports = listTicketCategoriesController;
