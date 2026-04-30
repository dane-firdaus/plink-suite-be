const models = require("../../models");

const listProductTypes = async (req, res) => {
  try {
    const data = await models.listProductTypes();

    res.status(200).json({
      data,
      status: 200,
    });
  } catch (error) {
    console.log(error.stack);
    res.status(500).json({
      message: "Internal server error !",
      status: 500,
    });
  }
};

module.exports = listProductTypes;
