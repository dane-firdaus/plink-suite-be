const models = require("../../models");

const updateCurrentUserProfile = async (req, res) => {
  try {
    const profile = await models.updateCurrentUserProfile({
      currentEmail: req.user?.email,
      username: req.body.username,
      fullname: req.body.fullname,
      division_id: req.body.division_id,
    });

    return res.status(200).json({
      success: true,
      message: "User profile updated successfully",
      data: profile,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update user profile",
    });
  }
};

module.exports = updateCurrentUserProfile;
