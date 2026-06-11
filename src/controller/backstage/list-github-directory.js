const {
  ensureGithubConfigured,
  githubGet,
  handleGithubError,
} = require("./shared");

const listGithubDirectoryController = async (req, res) => {
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
      path: `/repos/${config.owner}/${config.repo}/contents${encodedPath ? `/${encodedPath}` : ""}`,
      searchParams: { ref: branch || undefined },
    });

    const items = Array.isArray(payload) ? payload : [payload];

    return res.status(200).json({
      message: "GitHub directory loaded successfully",
      status: 200,
      data: {
        configured: true,
        path,
        branch: branch || null,
        items: items.map((item) => ({
          name: item.name,
          path: item.path,
          type: item.type,
          size: item.size,
          sha: item.sha,
          html_url: item.html_url,
          download_url: item.download_url,
        })),
      },
    });
  } catch (error) {
    return handleGithubError(res, error, "Failed to load GitHub directory");
  }
};

module.exports = listGithubDirectoryController;
