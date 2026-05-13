const models = require("../../models");

const forgotPassword = async (req, res) => {
  try {
    await models.forgotPassword({
      email: req.body.email,
      username: req.body.username,
      fullname: req.body.fullname,
      newPassword: req.body.new_password,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to reset password",
    });
  }
};

module.exports = forgotPassword;
