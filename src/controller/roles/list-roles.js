const models = require("../../models");

const listRoles = async (req, res) => {
    try {
      const { name, limit, page } = req.query;
  
      const response = await models.listRoles({
        name,
        limit: parseInt(limit) || 10,
        page: parseInt(page) || 1,
      });
  
      res.status(200).json({
        success: true,
        message: "Roles retrieved successfully",
        data: response.data,
        pagination: response.pagination,
      });
    } catch (error) {
      res.status(500).json({ message: "Error retrieving roles", error: error.message });
    }
  };

  module.exports = listRoles