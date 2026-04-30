const models = require("../../models");

const listTicketsController = async (req, res) => {
  try {
    const {
      page,
      limit,
      search,
      status,
      priority,
      category_code,
      channel,
      bank,
      product,
      category_group,
      date_from,
      date_to,
    } = req.query;
    const result = await models.listTickets({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      search,
      status,
      priority,
      category_code,
      channel,
      bank,
      product,
      category_group,
      date_from,
      date_to,
    });

    res.status(200).json({
      success: true,
      message: "Tickets retrieved successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.log(error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve tickets",
    });
  }
};

module.exports = listTicketsController;
