const models = require("../../models");

const listPrivilegeCatalogController = async (_req, res) => {
  try {
    const data = await models.listPrivilegeCatalog();

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.log(error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve privilege catalog",
    });
  }
};

module.exports = listPrivilegeCatalogController;
