const MPM_QRIS_BASE_URL = process.env.MPM_QRIS_BASE_URL || "http://10.122.11.51:8081";

const buildExternalUrl = (path, searchParams = {}) => {
  const url = new URL(`${MPM_QRIS_BASE_URL}${path}`);

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

const parseTextResponse = async (response) => {
  const text = await response.text();
  let parsed = text;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (error) {
    parsed = text;
  }

  if (!response.ok) {
    const error = new Error(
      typeof parsed === "object" && parsed?.message
        ? parsed.message
        : `External API request failed with status ${response.status}`
    );
    error.status = response.status;
    error.payload = parsed;
    throw error;
  }

  return parsed;
};

const handleExternalApiError = (res, error, fallbackMessage) =>
  res.status(Number(error?.status || 500)).json({
    success: false,
    message: fallbackMessage,
    error: error?.message || "Unknown external API error",
    details: error?.payload || null,
  });

module.exports = {
  MPM_QRIS_BASE_URL,
  buildExternalUrl,
  parseTextResponse,
  handleExternalApiError,
};
