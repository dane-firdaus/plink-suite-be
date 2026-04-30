const models = require("../../models");

const listUsers = async (req, res) => {
    const { email, name, limit, page } = req.query;
    try {

        const users = await models.listUsers({
          email,
          name,
          limit: parseInt(limit) || 10,
          page: parseInt(page) || 1,
        });
        res.status(200).json({
          success: true,
          message: "Users retrieved successfully",
          data: users.data,
          paginations : users.pagination
        });
    } catch (error) {
        console.log(error.stack);
        res.status(500).json({
            message : "internal server error !",
            status : 500
        })
    }
}

module.exports = listUsers