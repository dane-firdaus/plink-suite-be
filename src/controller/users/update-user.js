const models = require("../../models");

const updateUser = async (req, res) => {
  try {
    const user = await models.updateUser({
      userId: Number(req.params.userId),
      ...req.body,
    });

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update user",
    });
  }
};

module.exports = updateUser;
