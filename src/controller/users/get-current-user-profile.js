const models = require("../../models");

const getCurrentUserProfile = async (req, res) => {
  try {
    const profile = await models.getCurrentUserProfile({
      email: req.user?.email,
    });

    return res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: profile,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve user profile",
    });
  }
};

module.exports = getCurrentUserProfile;
