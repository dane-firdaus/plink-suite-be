const {
  buildExternalUrl,
  parseTextResponse,
  handleExternalApiError,
} = require("./mpm-qris-shared");

const listMpmQrisFilesController = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 0, 0);
    const size = Math.max(Number(req.query.size) || 10, 1);

    const response = await fetch(
      buildExternalUrl("/processedFiles", {
        page,
        size,
      }),
      {
        method: "GET",
        redirect: "follow",
      }
    );

    const payload = await parseTextResponse(response);

    return res.status(200).json({
      success: true,
      message: "MPM QRIS files loaded successfully",
      data: payload,
    });
  } catch (error) {
    return handleExternalApiError(res, error, "Failed to load MPM QRIS files");
  }
};

module.exports = listMpmQrisFilesController;
