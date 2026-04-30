const models = require("../../models");

const listUserWorkspacesController = async (req, res) => {
  try {
    const workspaces = await models.listUserWorkspaces({
      email: req.user?.email,
    });

    return res.status(200).json({
      success: true,
      message: "User workspaces retrieved successfully",
      data: workspaces,
    });
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user workspaces",
    });
  }
};

module.exports = listUserWorkspacesController;
