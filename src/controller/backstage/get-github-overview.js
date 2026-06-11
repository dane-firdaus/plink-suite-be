const {
  ensureGithubConfigured,
  githubGet,
  getGithubConfig,
  handleGithubError,
} = require("./shared");

const mapUser = (user) =>
  user
    ? {
        login: user.login,
        avatar_url: user.avatar_url,
        html_url: user.html_url,
      }
    : null;

const mapIssueLabel = (label) => ({
  id: label.id,
  name: label.name,
  color: label.color,
});

const mapPullFile = (file) => ({
  filename: file.filename,
  status: file.status,
  additions: file.additions,
  deletions: file.deletions,
  changes: file.changes,
  blob_url: file.blob_url,
  raw_url: file.raw_url,
  patch_excerpt: file.patch ? file.patch.slice(0, 1200) : "",
});

const getGithubOverviewController = async (req, res) => {
  const config = getGithubConfig();

  if (!config.configured) {
    return res.status(200).json({
      message: "GitHub integration is not configured",
      status: 200,
      data: {
        configured: false,
        missing: config.missing,
      },
    });
  }

  try {
    const [repo, branches, pulls, issues, commits] = await Promise.all([
      githubGet({
        token: config.token,
        path: `/repos/${config.owner}/${config.repo}`,
      }),
      githubGet({
        token: config.token,
        path: `/repos/${config.owner}/${config.repo}/branches`,
        searchParams: { per_page: 8 },
      }),
      githubGet({
        token: config.token,
        path: `/repos/${config.owner}/${config.repo}/pulls`,
        searchParams: { state: "open", per_page: 5 },
      }),
      githubGet({
        token: config.token,
        path: `/repos/${config.owner}/${config.repo}/issues`,
        searchParams: { state: "open", per_page: 8 },
      }),
      githubGet({
        token: config.token,
        path: `/repos/${config.owner}/${config.repo}/commits`,
        searchParams: { per_page: 6 },
      }),
    ]);

    const pullRequests = Array.isArray(pulls) ? pulls : [];
    const sourceFocus = await Promise.all(
      pullRequests.slice(0, 3).map(async (pullRequest) => {
        const files = await githubGet({
          token: config.token,
          path: `/repos/${config.owner}/${config.repo}/pulls/${pullRequest.number}/files`,
          searchParams: { per_page: 20 },
        });

        return {
          number: pullRequest.number,
          title: pullRequest.title,
          html_url: pullRequest.html_url,
          changed_files: pullRequest.changed_files ?? files.length,
          additions: pullRequest.additions ?? files.reduce((sum, file) => sum + Number(file.additions || 0), 0),
          deletions: pullRequest.deletions ?? files.reduce((sum, file) => sum + Number(file.deletions || 0), 0),
          files: files.slice(0, 6).map(mapPullFile),
        };
      })
    );

    return res.status(200).json({
      message: "GitHub workspace overview loaded successfully",
      status: 200,
      data: {
        configured: true,
        repo: {
          name: repo.name,
          full_name: repo.full_name,
          private: repo.private,
          description: repo.description,
          html_url: repo.html_url,
          default_branch: repo.default_branch,
          open_issues_count: repo.open_issues_count,
          stargazers_count: repo.stargazers_count,
          forks_count: repo.forks_count,
          updated_at: repo.updated_at,
        },
        branches: (branches || []).map((branch) => ({
          name: branch.name,
          protected: branch.protected,
          html_url: `${repo.html_url}/tree/${encodeURIComponent(branch.name)}`,
          commit_sha: branch.commit?.sha || "",
        })),
        pull_requests: pullRequests.map((pullRequest) => ({
          number: pullRequest.number,
          title: pullRequest.title,
          state: pullRequest.state,
          html_url: pullRequest.html_url,
          draft: Boolean(pullRequest.draft),
          created_at: pullRequest.created_at,
          updated_at: pullRequest.updated_at,
          user: mapUser(pullRequest.user),
          head_ref: pullRequest.head?.ref || "",
          base_ref: pullRequest.base?.ref || "",
        })),
        issues: (issues || [])
          .filter((issue) => !issue.pull_request)
          .slice(0, 5)
          .map((issue) => ({
            number: issue.number,
            title: issue.title,
            state: issue.state,
            html_url: issue.html_url,
            created_at: issue.created_at,
            updated_at: issue.updated_at,
            user: mapUser(issue.user),
            labels: Array.isArray(issue.labels) ? issue.labels.map(mapIssueLabel) : [],
          })),
        commits: (commits || []).map((commit) => ({
          sha: commit.sha,
          short_sha: String(commit.sha || "").slice(0, 7),
          message: commit.commit?.message?.split("\n")[0] || "",
          html_url: commit.html_url,
          author_name: commit.commit?.author?.name || commit.author?.login || "Unknown",
          author_avatar: commit.author?.avatar_url || "",
          committed_at: commit.commit?.author?.date || null,
        })),
        source_focus: sourceFocus,
      },
    });
  } catch (error) {
    return handleGithubError(res, error, "Failed to load GitHub workspace overview");
  }
};

module.exports = getGithubOverviewController;
