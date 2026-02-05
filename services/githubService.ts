
import { GitHubConfig } from "../types";

export const pushToGitHub = async (config: GitHubConfig, data: any) => {
  const { token, repo, path } = config;
  if (!token || !repo || !path) throw new Error("GitHub configuration is incomplete");

  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

  // We need the current SHA of the file to update it
  let sha: string | null = null;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `token ${token}` }
    });
    if (res.ok) {
      const json = await res.json();
      sha = json.sha;
    }
  } catch (e) {
    // File might not exist yet
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Syncing schedule data from EduPlan Pro',
      content,
      sha: sha || undefined
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to push to GitHub");
  }

  return true;
};

export const pullFromGitHub = async (config: GitHubConfig) => {
  const { token, repo, path } = config;
  if (!token || !repo || !path) throw new Error("GitHub configuration is incomplete");

  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const response = await fetch(url, {
    headers: { Authorization: `token ${token}` }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to pull from GitHub");
  }

  const json = await response.json();
  const content = decodeURIComponent(escape(atob(json.content)));
  return JSON.parse(content);
};
