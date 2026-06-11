const {
  buildExternalUrl,
  parseTextResponse,
  handleExternalApiError,
} = require("./mpm-qris-shared");

const uploadMpmQrisFileController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "MPM file is required",
      });
    }

    const uploadDate = String(req.body.upload_date || "").trim();

    if (!/^\d{8}$/.test(uploadDate)) {
      return res.status(400).json({
        success: false,
        message: "upload_date must use YYYYMMDD format",
      });
    }

    const formData = new FormData();
    const blob = new Blob([req.file.buffer], {
      type: req.file.mimetype || "application/octet-stream",
    });

    formData.append("files", blob, req.file.originalname);

    const uploadFileResponse = await fetch(
      buildExternalUrl(`/api/merchant-onboarding/uploadFile/${uploadDate}`),
      {
        method: "POST",
        body: formData,
        redirect: "follow",
      }
    );
    const uploadFilePayload = await parseTextResponse(uploadFileResponse);

    const triggerUploadResponse = await fetch(
      buildExternalUrl(`/api/merchant-onboarding/upload/${uploadDate}`),
      {
        method: "GET",
        redirect: "follow",
      }
    );
    const triggerUploadPayload = await parseTextResponse(triggerUploadResponse);

    return res.status(200).json({
      success: true,
      message: "MPM QRIS upload completed successfully",
      data: {
        upload_date: uploadDate,
        file_name: req.file.originalname,
        upload_file_response: uploadFilePayload,
        trigger_upload_response: triggerUploadPayload,
      },
    });
  } catch (error) {
    return handleExternalApiError(res, error, "Failed to upload MPM QRIS file");
  }
};

module.exports = uploadMpmQrisFileController;
