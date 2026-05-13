const models = require("../../models");

const listTicketOptionValuesController = async (req, res) => {
  try {
    const { field_name: fieldName, search = "", page = 1, limit = 50 } = req.query;
    const options = await models.listTicketOptionValues({ fieldName, search, page, limit });

    return res.status(200).json({
      success: true,
      message: "Ticket option values retrieved successfully",
      data: options.data,
      pagination: options.pagination,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve ticket option values",
    });
  }
};

module.exports = listTicketOptionValuesController;
