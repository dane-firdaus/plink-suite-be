const {
  ensureGithubConfigured,
  githubGet,
  handleGithubError,
} = require("./shared");

const MAX_CONTENT_LENGTH = 12000;

const decodeGithubContent = (content = "", encoding = "") => {
  if (encoding !== "base64") {
    return String(content || "");
  }

  return Buffer.from(String(content || "").replace(/\n/g, ""), "base64").toString("utf8");
};

const getGithubContentController = async (req, res) => {
  const config = ensureGithubConfigured(res);

  if (!config) {
    return null;
  }

  try {
    const path = String(req.query.path || "").trim();
    const branch = String(req.query.branch || "").trim();
    const encodedPath = path
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");

    const payload = await githubGet({
      token: config.token,
      path: `/repos/${config.owner}/${config.repo}/contents/${encodedPath}`,
      searchParams: { ref: branch || undefined },
    });

    if (payload.type !== "file") {
      return res.status(400).json({
        message: "Requested path is not a file",
        status: 400,
      });
    }

    const decoded = decodeGithubContent(payload.content, payload.encoding);
    const preview = decoded.slice(0, MAX_CONTENT_LENGTH);

    return res.status(200).json({
      message: "GitHub file content loaded successfully",
      status: 200,
      data: {
        configured: true,
        name: payload.name,
        path: payload.path,
        sha: payload.sha,
        size: payload.size,
        html_url: payload.html_url,
        download_url: payload.download_url,
        encoding: payload.encoding,
        truncated: decoded.length > MAX_CONTENT_LENGTH,
        content: preview,
      },
    });
  } catch (error) {
    return handleGithubError(res, error, "Failed to load GitHub file content");
  }
};

module.exports = getGithubContentController;
