const models = require("../../models");

const deleteUser = async (req, res) => {
  try {
    const deletedUser = await models.deleteUser({
      userId: Number(req.params.userId),
    });

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: deletedUser,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to delete user",
    });
  }
};

module.exports = deleteUser;
