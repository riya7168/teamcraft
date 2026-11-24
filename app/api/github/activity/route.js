import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

const githubHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "TeamCraft-Workspace",
};
const activityCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(request) {
  const projectId = new URL(request.url).searchParams.get("projectId");
  const forceRefresh = new URL(request.url).searchParams.get("refresh") === "1";
  if (!projectId) return NextResponse.json({ error: "Project id is required." }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to view repository activity." }, { status: 401 });

    const { data: membership, error: membershipError } = await supabase
      .from("project_members").select("project_id").eq("project_id", projectId).eq("user_id", user.id).maybeSingle();
    if (membershipError || !membership) return NextResponse.json({ error: "You do not have access to this project." }, { status: 403 });

    const { data: project, error: projectError } = await supabase
      .from("projects").select("github_repo_url").eq("id", projectId).single();
    if (projectError) return NextResponse.json({ error: "Could not load the project repository." }, { status: 404 });
    const match = project.github_repo_url?.match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\.git)?\/?$/i);
    if (!match) return NextResponse.json({ error: "Add a valid GitHub repository URL in project settings." }, { status: 400 });

    const repoPath = `${encodeURIComponent(match[1])}/${encodeURIComponent(match[2].replace(/\.git$/i, ""))}`;
    const cached = activityCache.get(repoPath);
    if (forceRefresh) activityCache.delete(repoPath);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data, { headers: { "Cache-Control": "private, no-store" } });
    }
    const endpoints = [
      `https://api.github.com/repos/${repoPath}`,
      `https://api.github.com/repos/${repoPath}/commits?per_page=5`,
      `https://api.github.com/repos/${repoPath}/pulls?state=all&per_page=5`,
      `https://api.github.com/repos/${repoPath}/contributors?per_page=5`,
    ];
    const headers = process.env.GITHUB_TOKEN
      ? { ...githubHeaders, Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : githubHeaders;
    const responses = await Promise.all(endpoints.map((url) => fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(8000) })));
    if (responses.some((response) => response.status === 404)) return NextResponse.json({ error: "This repository is private or could not be found. Only public repositories are supported." }, { status: 404 });
    if (responses.some((response) => response.status === 403 || response.status === 429)) {
      const limitedResponse = responses.find((response) => response.status === 403 || response.status === 429);
      const resetAt = Number(limitedResponse.headers.get("x-ratelimit-reset"));
      const retryMessage = resetAt ? ` Try again after ${new Date(resetAt * 1000).toLocaleTimeString()}.` : " Try again later.";
      const tokenMessage = process.env.GITHUB_TOKEN ? " Check that the server-side GITHUB_TOKEN is valid and can read this public repository." : " Add a server-side GITHUB_TOKEN to .env.local and restart the dev server for a higher request limit.";
      return NextResponse.json({ error: `GitHub’s API rate limit was reached.${tokenMessage}${retryMessage}` }, { status: 429 });
    }
    if (responses.some((response) => !response.ok)) return NextResponse.json({ error: "GitHub could not return repository activity." }, { status: 502 });
    const [repository, commits, pullRequests, contributors] = await Promise.all(responses.map((response) => response.status === 204 ? [] : response.json()));

    const data = {
      repository: { name: repository.full_name, description: repository.description, stars: repository.stargazers_count, openIssues: repository.open_issues_count, url: repository.html_url },
      commits: commits.map((commit) => ({ sha: commit.sha.slice(0, 7), message: commit.commit.message.split("\n")[0], author: commit.commit.author?.name || commit.author?.login || "Contributor", date: commit.commit.author?.date || null, url: commit.html_url })),
      pullRequests: pullRequests.map((pull) => ({ number: pull.number, title: pull.title, state: pull.state, merged: Boolean(pull.merged_at), updatedAt: pull.updated_at, url: pull.html_url })),
      contributors: contributors.map((contributor) => ({ login: contributor.login, contributions: contributor.contributions, url: contributor.html_url })),
    };
    activityCache.set(repoPath, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not reach GitHub. Try again when you are online." }, { status: 502 });
  }
}
