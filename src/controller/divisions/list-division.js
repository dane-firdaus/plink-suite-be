const models = require("../../models");

const listDivisionsController = async (req, res) => {
  try {
    const { name, limit, page } = req.query;

    const response = await models.listDivisions({
      name,
      limit: parseInt(limit, 10) || 100,
      page: parseInt(page, 10) || 1,
    });

    return res.status(200).json({
      success: true,
      message: "Divisions retrieved successfully",
      data: response.data,
      pagination: response.pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve divisions",
    });
  }
};

module.exports = listDivisionsController;
