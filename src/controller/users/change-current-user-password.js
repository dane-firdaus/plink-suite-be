const models = require("../../models");

const changeCurrentUserPassword = async (req, res) => {
  try {
    await models.changeCurrentUserPassword({
      currentEmail: req.user?.email,
      currentPassword: req.body.current_password,
      newPassword: req.body.new_password,
    });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update password",
    });
  }
};

module.exports = changeCurrentUserPassword;
