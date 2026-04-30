const models = require("../../models");

const createUser = async (req, res) => {
  try {
    const user = await models.createUser(req.body);

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create user",
    });
  }
};

module.exports = createUser;
