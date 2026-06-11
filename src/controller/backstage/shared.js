const GITHUB_API_BASE_URL = process.env.GITHUB_API_BASE_URL || "https://api.github.com";

const getGithubConfig = () => {
  const owner = String(process.env.GITHUB_OWNER || "").trim();
  const repo = String(process.env.GITHUB_REPO || "").trim();
  const token = String(process.env.GITHUB_TOKEN || "").trim();
  const missing = [];

  if (!owner) {
    missing.push("GITHUB_OWNER");
  }

  if (!repo) {
    missing.push("GITHUB_REPO");
  }

  return {
    owner,
    repo,
    token,
    missing,
    configured: missing.length === 0,
  };
};

const getGithubHeaders = (token) => {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "management-dashboard-backstage",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const buildGithubUrl = (path, searchParams = {}) => {
  const url = new URL(`${GITHUB_API_BASE_URL}${path}`);

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

const parseGithubJson = async (response) => {
  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      `GitHub request failed with status ${response.status}`;
    const githubError = new Error(message);
    githubError.status = response.status;
    githubError.payload = payload;
    throw githubError;
  }

  return payload;
};

const githubGet = async ({ token, path, searchParams }) => {
  const response = await fetch(buildGithubUrl(path, searchParams), {
    headers: getGithubHeaders(token),
  });

  return parseGithubJson(response);
};

const ensureGithubConfigured = (res) => {
  const config = getGithubConfig();

  if (config.configured) {
    return config;
  }

  res.status(503).json({
    message: "GitHub integration is not configured",
    status: 503,
    data: {
      configured: false,
      missing: config.missing,
    },
  });

  return null;
};

const handleGithubError = (res, error, fallbackMessage) => {
  const status = Number(error?.status || 500);

  return res.status(status).json({
    message: fallbackMessage,
    status,
    error: error?.message || "Unknown GitHub error",
    details: error?.payload || null,
  });
};

module.exports = {
  getGithubConfig,
  githubGet,
  ensureGithubConfigured,
  handleGithubError,
};
