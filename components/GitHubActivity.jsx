"use client";

import { useCallback, useEffect, useState } from "react";

export default function GitHubActivity({ projectId, repositoryUrl }) {
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadActivity = useCallback(async (forceRefresh = false) => {
    if (!projectId || !repositoryUrl) return;
    setBusy(true);
    setError("");
    try {
      const refreshQuery = forceRefresh ? "&refresh=1" : "";
      const response = await fetch(`/api/github/activity?projectId=${encodeURIComponent(projectId)}${refreshQuery}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load GitHub activity.");
      setActivity(result);
    } catch (loadError) {
      setError(loadError.message || "Could not load GitHub activity.");
      setActivity(null);
    } finally {
      setBusy(false);
    }
  }, [projectId, repositoryUrl]);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  if (!repositoryUrl) return null;

  return <section className="panel github-activity-panel">
    <div className="panel-heading"><div><h2>GitHub activity</h2><p>Recent public repository activity</p></div><button className="text-link" onClick={() => loadActivity(true)} disabled={busy}>{busy ? "Refreshing…" : "Refresh from GitHub ↻"}</button></div>
    {error && <p className="github-activity-error" role="status">{error}</p>}
    {activity && <>
      <div className="github-repo-summary"><a href={activity.repository.url} target="_blank" rel="noreferrer">{activity.repository.name} ↗</a><span>★ {activity.repository.stars}</span><span>{activity.repository.openIssues} open issues</span>{activity.repository.description && <p>{activity.repository.description}</p>}</div>
      <div className="github-activity-columns"><div><h3>Recent commits</h3>{activity.commits.length ? activity.commits.map((commit) => <a className="github-activity-row" href={commit.url} target="_blank" rel="noreferrer" key={commit.sha}><b>{commit.message}</b><span>{commit.author} · {commit.date ? new Date(commit.date).toLocaleDateString() : "date unavailable"} · {commit.sha}</span></a>) : <p className="github-activity-empty">No recent commits.</p>}</div><div><h3>Pull requests</h3>{activity.pullRequests.length ? activity.pullRequests.map((pull) => <a className="github-activity-row" href={pull.url} target="_blank" rel="noreferrer" key={pull.number}><b>#{pull.number} {pull.title}</b><span>{pull.merged ? "Merged" : pull.state} · {new Date(pull.updatedAt).toLocaleDateString()}</span></a>) : <p className="github-activity-empty">No recent pull requests.</p>}</div></div>
      <div className="github-contributors"><h3>Top contributors</h3>{activity.contributors.length ? activity.contributors.map((contributor) => <a href={contributor.url} target="_blank" rel="noreferrer" key={contributor.login}>{contributor.login} <span>{contributor.contributions} commits</span></a>) : <p className="github-activity-empty">Contributor data is unavailable for this repository.</p>}</div>
    </>}
  </section>;
}
