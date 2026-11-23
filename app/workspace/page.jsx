"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "../../lib/supabase/client";

const PROJECT_SKILL_OPTIONS = [
  "Research", "Writing", "Communication", "Project management", "Marketing", "Social media",
  "Graphic design", "UI/UX design", "Figma", "Web development", "React", "JavaScript",
  "Python", "Data analysis", "Video editing", "Photography", "Public speaking", "Event planning", "Fundraising",
];
const PROFILE_INTEREST_OPTIONS = [
  "Education", "Student communities", "Accessibility", "Mental health", "Climate action",
  "Community service", "Entrepreneurship", "Technology", "Health and wellness", "Arts and culture",
  "Local events", "Sustainability", "Social impact", "Personal finance", "Sports",
];
const isProjectSkillMatch = (skill, needs) => needs.some((need) => need.toLowerCase() === skill.toLowerCase());
const memberSkillMatches = (person, needs) => needs.filter((need) => person.skills.some((skill) => skill.toLowerCase() === need.toLowerCase()));

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [backendError, setBackendError] = useState("");
  const [active, setActive] = useState("Overview");
  const [period, setPeriod] = useState("This week");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [joined, setJoined] = useState([]);
  const [logged, setLogged] = useState(false);
  const [contributionBusy, setContributionBusy] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState([]);
  const [actionModal, setActionModal] = useState("");
  const [profileModal, setProfileModal] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileSkills, setProfileSkills] = useState([]);
  const [customProfileSkills, setCustomProfileSkills] = useState("");
  const [profileInterests, setProfileInterests] = useState([]);
  const [customProfileInterests, setCustomProfileInterests] = useState("");
  const [profileWeeklyHours, setProfileWeeklyHours] = useState(5);
  const [profileDiscoverable, setProfileDiscoverable] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [actionInput, setActionInput] = useState("");
  const [actionDescription, setActionDescription] = useState("");
  const [actionInterests, setActionInterests] = useState("");
  const [actionHours, setActionHours] = useState("0");
  const [actionDueDate, setActionDueDate] = useState("");
  const [actionGithubRepoUrl, setActionGithubRepoUrl] = useState("");
  const [selectedNeedSkills, setSelectedNeedSkills] = useState([]);
  const [customNeedSkills, setCustomNeedSkills] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectInterests, setProjectInterests] = useState([]);
  const [weeklyHoursNeeded, setWeeklyHoursNeeded] = useState(0);
  const [projectDueDate, setProjectDueDate] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [myContributions, setMyContributions] = useState([]);
  const [projectNeeds, setProjectNeeds] = useState(["Marketing", "Content writing"]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const visiblePeople = useMemo(() => teamMembers.filter((p) => `${p.name} ${p.role} ${p.skills.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [query, teamMembers]);
  const coveredSkills = projectNeeds.filter((skill) => teamMembers.some((member) => member.skills.some((item) => item.toLowerCase() === skill.toLowerCase())));
  const uncoveredSkills = projectNeeds.filter((skill) => !coveredSkills.includes(skill));
  const capacityTotal = teamMembers.reduce((sum, member) => sum + member.hours, 0);
  const coveragePercent = projectNeeds.length ? Math.round(coveredSkills.length / projectNeeds.length * 100) : 0;
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const navItems = ["Overview", "Team", "Matching", "Contributions"];

  const loadProjectData = async (supabase, selectedProjectId, interestNeeds = [], hoursNeeded = 0, currentUserId = userId) => {
    const [memberResult, skillResult, contributionResult, candidateResult, shortlistResult] = await Promise.all([
      supabase.from("project_members").select("user_id, role, joined_at, profiles(display_name, skills, interests, weekly_hours)").eq("project_id", selectedProjectId),
      supabase.from("project_skills").select("skill").eq("project_id", selectedProjectId),
      supabase.from("contributions").select("id, user_id, title, category, minutes, notes, status, created_at, profiles(display_name)").eq("project_id", selectedProjectId).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, display_name, skills, interests, weekly_hours").eq("discoverable", true).neq("id", currentUserId),
      supabase.from("project_shortlists").select("candidate_id").eq("project_id", selectedProjectId).eq("shortlisted_by", currentUserId),
    ]);
    if (memberResult.error) throw memberResult.error;
    if (skillResult.error) throw skillResult.error;
    if (contributionResult.error) throw contributionResult.error;
    if (candidateResult.error) throw candidateResult.error;
    if (shortlistResult.error) throw shortlistResult.error;

    const minutesByUser = (contributionResult.data || []).reduce((totals, entry) => ({ ...totals, [entry.user_id]: (totals[entry.user_id] || 0) + entry.minutes }), {});
    setTeamMembers((memberResult.data || []).map((membership) => {
      const profile = membership.profiles || {};
      const name = profile.display_name || "Team member";
      const hours = profile.weekly_hours || 0;
      const contribution = hours ? Math.min(100, Math.round((minutesByUser[membership.user_id] || 0) / (hours * 60) * 100)) : 0;
      return { id: membership.user_id, name, initials: name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role: membership.role === "lead" ? "Project lead" : "Member", skills: profile.skills || [], interests: profile.interests || [], hours, color: membership.role === "lead" ? "coral" : "blue", contribution, status: membership.role === "lead" ? "Project lead" : "Project member" };
    }));
    setProjectNeeds((skillResult.data || []).map((item) => item.skill));
    setMyContributions((contributionResult.data || []).map((entry) => ({ id: entry.id, task: entry.title, category: entry.category, hours: `${Math.round(entry.minutes / 60 * 10) / 10} hrs`, notes: entry.notes, author: entry.profiles?.display_name || "Team member", status: entry.status, createdAt: entry.created_at })));
    setJoined((shortlistResult.data || []).map((item) => item.candidate_id));
    const skills = (skillResult.data || []).map((item) => item.skill.toLowerCase());
    setOpportunities((candidateResult.data || []).map((profile) => {
      const profileSkills = profile.skills || [];
      const profileInterests = profile.interests || [];
      const skillMatch = skills.length ? profileSkills.filter((skill) => skills.includes(skill.toLowerCase())).length / skills.length * 55 : 0;
      const interestMatch = interestNeeds.length ? profileInterests.filter((interest) => interestNeeds.map((item) => item.toLowerCase()).includes(interest.toLowerCase())).length / interestNeeds.length * 25 : 0;
      const availabilityMatch = hoursNeeded ? Math.min((profile.weekly_hours || 0) / hoursNeeded, 1) * 20 : ((profile.weekly_hours || 0) > 0 ? 20 : 0);
      const name = profile.display_name || "Teamcraft member";
      return { id: profile.id, initials: name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), name, detail: `Discoverable · ${profile.weekly_hours || 0} hrs/week`, skills: profileSkills, interests: profileInterests, match: Math.round(skillMatch + interestMatch + availabilityMatch), color: "gold" };
    }).sort((a, b) => b.match - a.match));
  };

  useEffect(() => {
    let alive = true;
    const initialize = async () => {
      if (!isSupabaseConfigured) {
        setBackendError("Supabase isn't connected yet. Add your project URL and publishable key to .env.local, then restart the dev server.");
        setReady(true);
        return;
      }
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.replace("/login");
          return;
        }
        if (!alive) return;
        setUserId(user.id);
        setUserName(user.user_metadata?.display_name || user.email?.split("@")[0] || "Team member");
        const { data: memberships, error: membershipError } = await supabase.from("project_members").select("project_id, role, projects(id, name, description, interests, weekly_hours_needed, due_date, github_repo_url, created_at)").eq("user_id", user.id).order("joined_at", { ascending: true });
        if (membershipError) throw membershipError;
        const projectList = (memberships || []).map((membership) => ({ ...membership.projects, role: membership.role })).filter((project) => project.id);
        const requestedProjectId = new URLSearchParams(window.location.search).get("project");
        if (!alive) return;
        setProjects(projectList);
        if (projectList.length) {
          const selected = projectList.find((project) => project.id === requestedProjectId) || projectList[0];
          setProjectId(selected.id);
          setProjectName(selected.name);
          setProjectDescription(selected.description || "");
          setProjectInterests(selected.interests || []);
          setWeeklyHoursNeeded(selected.weekly_hours_needed || 0);
          setProjectDueDate(selected.due_date || "");
          setGithubRepoUrl(selected.github_repo_url || "");
          setCurrentRole(selected.role);
          await loadProjectData(supabase, selected.id, selected.interests || [], selected.weekly_hours_needed || 0, user.id);
        }
      } catch (error) {
        if (alive) setBackendError(error.message || "Could not load your projects. Check your Supabase schema and policies.");
      } finally {
        if (alive) setReady(true);
      }
    };
    initialize();
    return () => { alive = false; };
  }, [router]);

  const signOut = async () => {
    if (isSupabaseConfigured) await createClient().auth.signOut();
    router.push("/");
  };

  const openProfile = async () => {
    setProfileError("");
    const { data, error } = await createClient().from("profiles").select("display_name, skills, interests, weekly_hours, discoverable").eq("id", userId).single();
    if (error) {
      notify(error.message || "Could not load your profile.");
      return;
    }
    const skills = data.skills || [];
    const interests = data.interests || [];
    setProfileName(data.display_name || "");
    setProfileSkills(skills.filter((skill) => PROJECT_SKILL_OPTIONS.includes(skill)));
    setCustomProfileSkills(skills.filter((skill) => !PROJECT_SKILL_OPTIONS.includes(skill)).join(", "));
    setProfileInterests(interests.filter((interest) => PROFILE_INTEREST_OPTIONS.includes(interest)));
    setCustomProfileInterests(interests.filter((interest) => !PROFILE_INTEREST_OPTIONS.includes(interest)).join(", "));
    setProfileWeeklyHours(data.weekly_hours ?? 0);
    setProfileDiscoverable(Boolean(data.discoverable));
    setProfileModal(true);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileBusy(true);
    setProfileError("");
    const skills = [...new Set([...profileSkills, ...customProfileSkills.split(",").map((item) => item.trim()).filter(Boolean)])];
    const interests = [...new Set([...profileInterests, ...customProfileInterests.split(",").map((item) => item.trim()).filter(Boolean)])];
    const weeklyHours = Number(profileWeeklyHours);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").update({
        display_name: profileName.trim(),
        skills,
        interests,
        weekly_hours: weeklyHours,
        discoverable: profileDiscoverable,
        updated_at: new Date().toISOString(),
      }).eq("id", userId);
      if (error) throw error;

      const { error: metadataError } = await supabase.auth.updateUser({ data: { display_name: profileName.trim() } });
      if (metadataError) throw metadataError;
      setUserName(profileName.trim());
      setTeamMembers((members) => members.map((member) => member.id === userId ? {
        ...member,
        name: profileName.trim(),
        initials: profileName.trim().split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
        skills,
        interests,
        hours: weeklyHours,
      } : member));
      setProfileModal(false);
      notify("Profile updated.");
    } catch (error) {
      setProfileError(error.message || "Could not save your profile.");
    } finally {
      setProfileBusy(false);
    }
  };

  const openAction = (kind) => {
    setActionModal(kind);
    setInviteCode("");
    setActionInput(kind === "settings" ? projectName : "");
    setActionDescription(kind === "settings" ? projectDescription : "");
    setActionInterests(kind === "settings" ? projectInterests.join(", ") : "");
    setActionHours(kind === "settings" ? String(weeklyHoursNeeded) : "0");
    setActionDueDate(kind === "settings" ? projectDueDate : "");
    setActionGithubRepoUrl(kind === "settings" ? githubRepoUrl : "");
    if (kind === "needs") {
      setSelectedNeedSkills(projectNeeds.filter((skill) => PROJECT_SKILL_OPTIONS.includes(skill)));
      setCustomNeedSkills(projectNeeds.filter((skill) => !PROJECT_SKILL_OPTIONS.includes(skill)).join(", "));
    }
  };

  const createProjectRecord = async (name, description = "", interests = [], hoursNeeded = 0) => {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error("Your session expired. Sign in again before creating a project.");
    setUserId(user.id);
    const { data: projectId, error: createError } = await supabase.rpc("create_project", {
      project_name: name,
      project_description: description,
      project_interests: interests,
      project_hours_needed: hoursNeeded,
    });
    if (createError) throw createError;
    const { data, error } = await supabase.from("projects").select("id, name, description, interests, weekly_hours_needed, created_at").eq("id", projectId).single();
    if (error) throw error;
    const project = { ...data, role: "lead" };
    setProjects([...projects, project]);
    setProjectId(project.id);
    setProjectName(project.name);
    setProjectDescription(project.description);
    setProjectInterests(project.interests || []);
    setWeeklyHoursNeeded(project.weekly_hours_needed || 0);
    setProjectDueDate("");
    setGithubRepoUrl("");
    setCurrentRole("lead");
    setTeamMembers([{ id: userId, name: userName, initials: userName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role: "Project lead", skills: [], interests: [], hours: 0, color: "coral", contribution: 0, status: "Project lead" }]);
    await loadProjectData(supabase, project.id, project.interests || [], project.weekly_hours_needed || 0, userId);
    return project;
  };

  const submitAction = async (event) => {
    event.preventDefault();
    const value = actionInput.trim();
    if (!value && actionModal !== "invite" && actionModal !== "needs") return;
    const supabase = createClient();
    try {
      if (actionModal === "project") {
        const interests = actionInterests.split(",").map((interest) => interest.trim()).filter(Boolean);
        await createProjectRecord(value, actionDescription, interests, Number(actionHours));
        notify(`Project “${value}” created. You are the project lead.`);
      } else if (actionModal === "settings") {
        const interests = actionInterests.split(",").map((interest) => interest.trim()).filter(Boolean);
        const normalizedRepoUrl = actionGithubRepoUrl.trim() || null;
        const { error } = await supabase.from("projects").update({ name: value, description: actionDescription, interests, weekly_hours_needed: Number(actionHours), due_date: actionDueDate || null, github_repo_url: normalizedRepoUrl }).eq("id", projectId);
        if (error) throw error;
        setProjects(projects.map((project) => project.id === projectId ? { ...project, name: value, description: actionDescription, interests, weekly_hours_needed: Number(actionHours), due_date: actionDueDate || null, github_repo_url: normalizedRepoUrl } : project));
        setProjectName(value);
        setProjectDescription(actionDescription);
        setProjectInterests(interests);
        setWeeklyHoursNeeded(Number(actionHours));
        setProjectDueDate(actionDueDate);
        setGithubRepoUrl(normalizedRepoUrl || "");
        await loadProjectData(supabase, projectId, interests, Number(actionHours));
        notify("Project settings saved");
      } else if (actionModal === "needs") {
        const skills = [...new Set([...selectedNeedSkills, ...customNeedSkills.split(",").map((skill) => skill.trim()).filter(Boolean)])];
        const { error: deleteError } = await supabase.from("project_skills").delete().eq("project_id", projectId);
        if (deleteError) throw deleteError;
        if (skills.length) {
          const { error } = await supabase.from("project_skills").insert(skills.map((skill) => ({ project_id: projectId, skill, created_by: userId })));
          if (error) throw error;
        }
        setProjectNeeds(skills);
        await loadProjectData(supabase, projectId, projectInterests, weeklyHoursNeeded, userId);
        notify("Project skill needs saved");
      } else if (actionModal === "invite") {
        const { data, error } = await supabase.from("projects").select("join_code").eq("id", projectId).single();
        if (error) throw error;
        setInviteCode(data.join_code);
        try {
          await navigator.clipboard.writeText(data.join_code);
          notify("Project code copied.");
        } catch { notify("Project code is ready to share."); }
      }
    } catch (error) {
      notify(error.message || "Could not save that change.");
      return;
    }
    if (actionModal !== "invite") setActionModal("");
  };

  const selectProject = async (project) => {
    setProjectId(project.id);
    setProjectName(project.name);
    setProjectDescription(project.description || "");
    setProjectInterests(project.interests || []);
    setWeeklyHoursNeeded(project.weekly_hours_needed || 0);
    setProjectDueDate(project.due_date || "");
    setGithubRepoUrl(project.github_repo_url || "");
    setCurrentRole(project.role);
    try {
      await loadProjectData(createClient(), project.id, project.interests || [], project.weekly_hours_needed || 0, userId);
    } catch (error) {
      notify(error.message || "Could not load project data.");
    }
  };

  const transferLead = async (memberId) => {
    if (!window.confirm("Transfer project lead to this member? You will become a member.")) return;
    const { error } = await createClient().rpc("transfer_project_lead", { target_project: projectId, next_lead: memberId });
    if (error) return notify(error.message || "Could not transfer project leadership.");
    setCurrentRole("member");
    setProjects(projects.map((project) => project.id === projectId ? { ...project, role: "member" } : project));
    await loadProjectData(createClient(), projectId);
    notify("Project lead role transferred");
  };

  const removeMember = async (member) => {
    if (!window.confirm(`Remove ${member.name} from ${projectName}?`)) return;
    const { error } = await createClient().from("project_members").delete().eq("project_id", projectId).eq("user_id", member.id);
    if (error) return notify(error.message || "Could not remove the member.");
    await loadProjectData(createClient(), projectId);
    notify(`${member.name} removed from the project`);
  };

  const toggleShortlist = async (candidate) => {
    const supabase = createClient();
    if (joined.includes(candidate.id)) {
      const { error } = await supabase.from("project_shortlists").delete().eq("project_id", projectId).eq("candidate_id", candidate.id);
      if (error) return notify(error.message || "Could not update your shortlist.");
      setJoined(joined.filter((id) => id !== candidate.id));
      notify(`${candidate.name} removed from shortlist`);
    } else {
      const { error } = await supabase.from("project_shortlists").insert({ project_id: projectId, shortlisted_by: userId, candidate_id: candidate.id });
      if (error) return notify(error.message || "Could not update your shortlist.");
      setJoined([...joined, candidate.id]);
      notify(`${candidate.name} added to shortlist`);
    }
  };

  const reviewContribution = async (entry, status) => {
    const { error } = await createClient().rpc("review_contribution", { contribution_id: entry.id, next_status: status });
    if (error) return notify(error.message || "Could not update contribution review.");
    await loadProjectData(createClient(), projectId);
    notify(status === "reviewed" ? "Contribution marked reviewed" : "Changes requested");
  };

  const publishContribution = async (event) => {
    event.preventDefault();
    if (contributionBusy) return;
    setContributionBusy(true);
    const form = new FormData(event.currentTarget);
    const hoursLabel = form.get("hours");
    const minutes = hoursLabel === "30 minutes" ? 30 : hoursLabel === "4+ hours" ? 240 : Number.parseInt(hoursLabel, 10) * 60;
    try {
      const { data, error } = await createClient().from("contributions").insert({ project_id: projectId, user_id: userId, title: form.get("task"), category: form.get("category"), minutes, notes: form.get("notes") || "" }).select("id, user_id, title, category, minutes, notes, status, created_at").single();
      if (error) throw error;
      setMyContributions((entries) => [{ ...data, task: data.title, author: userName, hours: hoursLabel, createdAt: data.created_at }, ...entries]);
      setLogged(false);
      notify("Contribution saved to the project log");
    } catch (error) {
      notify(error.message || "Could not save contribution.");
    } finally {
      setContributionBusy(false);
    }
  };

  if (!ready) return <main className="route-loading">Opening your workspace…</main>;
  if (!isSupabaseConfigured) return <main className="empty-workspace"><Link href="/" className="brand public-brand"><span className="brand-mark"><span>t</span></span><span>teamcraft</span></Link><div><span className="section-eyebrow">BACKEND CONNECTION REQUIRED</span><h1>Connect your Supabase project</h1><p>{backendError}</p><ol><li>Create a Supabase project.</li><li>Copy <b>.env.example</b> to <b>.env.local</b> and add your project URL and publishable key.</li><li>Run the migration in <b>supabase/migrations</b> in the Supabase SQL editor, then restart the dev server.</li></ol><button className="button button-dark" onClick={signOut}>Back to homepage</button></div></main>;
  if (backendError) return <main className="empty-workspace"><div><span className="section-eyebrow">WORKSPACE COULD NOT LOAD</span><h1>Check your backend setup</h1><p>{backendError}</p><button className="button button-dark" onClick={() => window.location.reload()}>Try again</button></div></main>;
  if (projects.length === 0) return <main className="empty-workspace"><Link href="/" className="brand public-brand"><span className="brand-mark"><span>t</span></span><span>teamcraft</span></Link><form className="first-project-card" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await createProjectRecord(form.get("name").trim(), form.get("description").trim(), String(form.get("interests") || "").split(",").map((item) => item.trim()).filter(Boolean), Number(form.get("hours_needed") || 0)); } catch (error) { setBackendError(error.message); } }}><span className="section-eyebrow">YOUR TEAM STARTS HERE</span><h1>Create your first project</h1><p>When you create a project, you become its project lead. You can invite teammates after the project is set up.</p><label>Project name<input name="name" required minLength={2} placeholder="e.g. Campus Connect" /></label><label>What are you working on?<textarea name="description" placeholder="Share the goal for this project" /></label><label>Interests related to this project<input name="interests" placeholder="Student wellbeing, campus life" /></label><label>Hours needed from a teammate each week<input name="hours_needed" type="number" min="0" max="168" defaultValue="5" /></label>{backendError && <div className="auth-error">{backendError}</div>}<button className="button button-dark" type="submit">Create project and become lead →</button><button className="signout-link" type="button" onClick={signOut}>Sign out</button></form></main>;

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><span>t</span></div><span>teamcraft</span></div>
      <div className="workspace-label">WORKSPACE</div>
      <div className="workspace-switch"><span className="workspace-icon">✳</span><span className="workspace-name">{projectName}<small>{currentRole === "lead" ? "Project lead" : "Project member"}</small></span></div>
      <div className="nav-label">MENU</div>
      <nav>{navItems.map((item, i) => <button key={item} onClick={() => setActive(item)} className={`nav-item ${active === item ? "selected" : ""}`}><span className="nav-icon">{["◫", "♙", "✳", "◷"][i]}</span>{item}{item === "Matching" && <span className="nav-count">3</span>}</button>)}</nav>
      <div className="sidebar-projects"><div className="nav-label">YOUR PROJECTS <button className="plus" aria-label="Create project" onClick={() => openAction("project")}>＋</button></div>{projects.map((project, index) => <button key={project.id} className={`project-link ${projectName === project.name ? "current" : ""}`} onClick={() => selectProject(project)}><i className={`project-dot ${index % 3 === 1 ? "violet" : index % 3 === 2 ? "yellow" : ""}`}></i>{project.name}</button>)}</div>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon">✦</div><b>Better teams start here.</b><p>Build a team around what people bring to the table.</p><button onClick={() => notify("Tip: start with the skills and weekly hours your project needs.")}>Explore the guide <span>↗</span></button></div><button className="profile" onClick={openProfile}><div className="avatar avatar-user">{userName.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><span><b>{userName}</b><small>{currentRole === "lead" ? "Project lead" : "Project member"} · Edit profile</small></span><span className="more">↗</span></button></div>
    </aside>

    <section className="main-area">
      <header className="topbar"><div className="breadcrumbs">My projects <span>/</span> <b>{projectName}</b></div><div className="top-actions"><button className="icon-button" aria-label="Notifications" onClick={() => notify("You’re all caught up")}>♧<i className="notification-dot"></i></button><div className="top-divider"></div><button className="avatar avatar-user small-user" aria-label="Edit profile" title="Edit profile" onClick={openProfile}>{userName.split(" ").map((part) => part[0]).join("").slice(0, 2)}</button></div></header>
      <div className="content-wrap">
        <div className="project-heading"><div><div className="eyebrow"><span className="live-dot"></span> IN PROGRESS <span className="eyebrow-separator">·</span> {currentRole === "lead" ? "PROJECT LEAD" : "PROJECT MEMBER"}</div><h1>{projectName}</h1><p className="subtitle">{projectDescription}</p>{githubRepoUrl && <a className="github-repo-link" href={githubRepoUrl} target="_blank" rel="noreferrer">GitHub repository ↗</a>}</div><div className="heading-actions">{currentRole === "lead" && <><button className="button button-light" onClick={() => openAction("settings")}>⚙ <span>Settings</span></button><button className="button button-dark" onClick={() => openAction("invite")}>＋ <span>Invite people</span></button></>}</div></div>
        <div className="project-meta"><span>◷ &nbsp;Created {projects.find((item) => item.id === projectId)?.created_at ? new Date(projects.find((item) => item.id === projectId).created_at).toLocaleDateString() : "Today"}</span><span className="meta-divider"></span><span>◎ &nbsp;{projectDueDate ? `Due ${new Date(`${projectDueDate}T00:00:00`).toLocaleDateString()}` : "No due date set"}</span><span className="meta-divider"></span><span className="meta-avatars">{teamMembers.slice(0, 4).map((member) => <i key={member.id} className={"avatar mini " + member.color}>{member.initials}</i>)}</span><span>{teamMembers.length} members</span><span className="meta-divider"></span><span className="privacy-pill">♙ &nbsp;Private</span></div>

      <div className="stats-grid"><article className="stat-card"><div className="stat-top"><span>SKILL COVERAGE</span><span className="stat-symbol green-symbol">◉</span></div><div className="stat-value">{coveragePercent}<span className="stat-unit">%</span></div><div className="stat-note">Of project skills covered by this team</div><div className="balance-bar"><i style={{ width: coveragePercent + "%" }}></i></div></article><article className="stat-card"><div className="stat-top"><span>WEEKLY CAPACITY</span><span className="stat-symbol blue-symbol">◷</span></div><div className="stat-value">{capacityTotal}<span className="stat-unit"> hrs</span></div><div className="stat-note">team availability · {weeklyHoursNeeded || 0} hrs needed</div><div className="capacity-bar"><i style={{ width: `${weeklyHoursNeeded ? Math.min(100, Math.round(capacityTotal / weeklyHoursNeeded * 100)) : 0}%` }}></i></div></article><article className="stat-card"><div className="stat-top"><span>CONTRIBUTIONS</span><span className="stat-symbol purple-symbol">↗</span></div><div className="stat-value">{myContributions.length}<span className="stat-unit"> updates</span></div><div className="stat-note">Shared project contribution log</div><div className="sparkline"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></article></div>

        <div className="tabs-row"><div className="tabs">{navItems.map((item) => <button key={item} onClick={() => setActive(item)} className={active === item ? "tab-active" : ""}>{item}{item === "Team" && <span>{teamMembers.length}</span>}</button>)}</div><button className="period-select" onClick={() => setPeriod(period === "This week" ? "Last week" : "This week")}>▦ &nbsp;{period} <span>⌄</span></button></div>

        {active === "Overview" && <div className="dashboard-grid"><div className="left-column">
          <section className="panel contribution-panel"><div className="panel-heading"><div><h2>Contribution balance</h2><p>How the work is shared across your team</p></div><button className="text-link" onClick={() => setActive("Contributions")}>View activity <span>↗</span></button></div><div className="chart-wrap"><div className="chart-y"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div className="chart-main"><div className="chart-lines"><i></i><i></i><i></i><i></i><i></i></div><div className="bars">{visiblePeople.map((p, i) => <div className="bar-group" key={p.name}><div className="bar-stack"><i className={`bar-seg seg-${i}`} style={{ height: `${p.contribution * .62}%` }}></i><i className={`bar-seg muted-seg seg-${i}`} style={{ height: `${(100 - p.contribution) * .62}%` }}></i></div><div className="bar-name"><span className={`avatar chart-avatar ${p.color}`}>{p.initials}</span><span>{p.name.split(" ")[0]}</span></div></div>)}</div><div className="chart-legend"><span><i className="legend-current"></i> Contributions logged</span><span><i className="legend-expected"></i> Expected share</span></div></div></div></section>
          <section className="panel team-panel"><div className="panel-heading"><div><h2>Your team <span className="heading-count">{String(teamMembers.length).padStart(2, "0")}</span></h2><p>Skills, roles, and weekly availability</p></div><button className="text-link" onClick={() => setActive("Team")}>See all <span>→</span></button></div><div className="team-table"><div className="table-head"><span>MEMBER</span><span>PROJECT SKILL MATCH</span><span>AVAILABILITY</span><span>CONTRIBUTION</span></div>{visiblePeople.slice(0, 4).map((person) => <div className="team-row" key={person.name}><div className="member-cell"><div className={`avatar ${person.color}`}>{person.initials}</div><div><b>{person.name}</b><small>{person.status === "On track" ? "Active this week" : person.status}</small></div></div><div className="role-cell"><b>{person.role}</b><small className="skill-match-summary">{projectNeeds.length ? `${memberSkillMatches(person, projectNeeds).length} of ${projectNeeds.length} needs matched` : "No project skills set"}</small><div className="skill-tags">{person.skills.slice(0, 2).map((s) => <span key={s} className={isProjectSkillMatch(s, projectNeeds) ? "skill-match" : "skill-unmatched"}>{s}</span>)}</div></div><div className="availability-cell"><b>{person.hours} hrs</b><small>per week</small></div><div className="contribution-cell"><div className="contribution-line"><div className="mini-progress"><i style={{ width: `${person.contribution}%` }}></i></div><b>{person.contribution}%</b></div><small>{person.status === "On track" ? "On track" : "Check in"}</small></div></div>)}</div></section>
          <section className="panel activity-panel"><div className="panel-heading"><div><h2>Latest activity</h2><p>A shared record of work in progress</p></div><button className="text-link" onClick={() => setActive("Contributions")}>View all <span>→</span></button></div><div className="activity-list">{myContributions.slice(0, 2).map((entry) => <div className="activity-item" key={entry.id}><div className="activity-avatar avatar-user">{entry.author.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div><p><b>{entry.author}</b> logged a contribution</p><small>{entry.task}</small></div><time>{new Date(entry.createdAt).toLocaleDateString()}</time></div>)}</div><button className="log-contribution" onClick={() => setLogged(true)}>＋ &nbsp; Log a contribution</button></section>
        </div><aside className="right-column"><section className="panel needs-panel"><div className="panel-heading"><div><h2>Project needs</h2><p>Keep the right skills in focus</p></div>{currentRole === "lead" && <button className="more-button" onClick={() => openAction("needs")}>···</button>}</div><div className="needs-progress"><span>TEAM COVERAGE</span><b>{coveredSkills.length} of {projectNeeds.length} skills</b></div><div className="coverage-track"><i style={{ width: `${coveragePercent}%` }}></i></div><div className="covered-skills">{coveredSkills.map((skill) => <span className="covered" key={skill}>✓ &nbsp;{skill}</span>)}{uncoveredSkills.map((skill) => <span className="needed" key={skill}>＋ &nbsp;{skill}</span>)}</div>{currentRole === "lead" && <button className="outline-button" onClick={() => openAction("needs")}>Edit project needs <span>↗</span></button>}</section>
          <section className="panel matches-panel"><div className="panel-heading"><div><div className="match-eyebrow">✳ &nbsp;SMART MATCHING</div><h2>People to meet</h2><p>Ranked by your project needs</p></div><button className="match-arrow" onClick={() => setActive("Matching")}>↗</button></div>{opportunities.slice(0, 3).map((person) => <div className="match-row" key={person.id}><div className={`avatar ${person.color}`}>{person.initials}</div><div className="match-person"><b>{person.name}</b><small>{person.detail}</small><div className="skill-tags match-tags">{person.skills.slice(0, 2).map((skill) => <span key={skill}>{skill}</span>)}</div></div><div className="match-score">{person.match}<small>% match</small></div><button className={`add-match ${joined.includes(person.id) ? "added" : ""}`} aria-label={`Shortlist ${person.name}`} onClick={() => toggleShortlist(person)}>{joined.includes(person.id) ? "✓" : "+"}</button></div>)}{opportunities.length === 0 && <p className="match-empty-note">No discoverable profiles yet.</p>}<button className="all-matches" onClick={() => setActive("Matching")}>Explore all matches <span>→</span></button></section>
          <section className="insight-card"><div className="insight-icon">✦</div><div><span>TEAM INSIGHT</span><p>Your team has strong design and engineering coverage. <b>Content writing</b> is the biggest gap.</p><button onClick={() => setActive("Matching")}>Find a match <span>→</span></button></div></section></aside></div>}
        {active === "Team" && <section className="panel full-panel"><div className="panel-heading"><div><h2>Team members</h2><p>Build a balanced team around people's strengths and schedules.</p></div>{currentRole === "lead" && <button className="button button-dark" onClick={() => openAction("invite")}>＋ Invite people</button>}</div><div className="search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people, roles, or skills" /></div><div className="team-table full-table"><div className="table-head"><span>MEMBER</span><span>PROJECT SKILL MATCH</span><span>AVAILABILITY</span><span>CONTRIBUTION</span></div>{visiblePeople.map((person) => <div className="team-row" key={person.name}><div className="member-cell"><div className={`avatar ${person.color}`}>{person.initials}</div><div><b>{person.name}</b><small>{person.status}</small></div></div><div className="role-cell"><b>{person.role}</b><small className="skill-match-summary">{projectNeeds.length ? `${memberSkillMatches(person, projectNeeds).length} of ${projectNeeds.length} needs matched` : "No project skills set"}</small><div className="skill-tags">{person.skills.map((s) => <span key={s} className={isProjectSkillMatch(s, projectNeeds) ? "skill-match" : "skill-unmatched"}>{s}</span>)}</div></div><div className="availability-cell"><b>{person.hours} hrs</b><small>per week</small></div><div className="contribution-cell"><div className="contribution-line"><div className="mini-progress"><i style={{ width: `${person.contribution}%` }}></i></div><b>{person.contribution}%</b></div><small>Contribution share</small>{currentRole === "lead" && person.role !== "Project lead" && <div className="member-controls"><button type="button" onClick={() => transferLead(person.id)}>Make lead</button><button type="button" onClick={() => removeMember(person)}>Remove</button></div>}</div></div>)}</div></section>}
        {active === "Matching" && <section className="panel full-panel matching-page"><div className="panel-heading"><div><div className="match-eyebrow">✳ &nbsp;SKILL + INTEREST + AVAILABILITY</div><h2>Find your next teammate</h2><p>Discoverable profiles are ranked by skill fit, shared interests, and available hours.</p></div>{currentRole === "lead" && <button className="button button-dark" onClick={() => openAction("invite")}>＋ Share join code</button>}</div><div className="match-filters"><span>Skills: <b>{projectNeeds.join(", ") || "Open to any skill"}</b></span><span>Interests: <b>{projectInterests.join(", ") || "Open to any interest"}</b></span><span>Hours needed: <b>{weeklyHoursNeeded || "Flexible"} hrs/week</b></span><button onClick={() => setQuery(query ? "" : "research")}>⚙ {query ? "Clear filter" : "Filter research"}</button></div>{opportunities.length === 0 ? <div className="empty-matches"><b>No discoverable profiles yet</b><p>Ask teammates to add their skills, interests, and availability, then opt in to matching when they create their account.</p></div> : opportunities.filter((person) => !query || `${person.name} ${person.detail} ${person.skills.join(" ")} ${person.interests.join(" ")}`.toLowerCase().includes(query.toLowerCase())).map((person) => <div className="candidate-card" key={person.id}><div className={`avatar candidate-avatar ${person.color}`}>{person.initials}</div><div className="candidate-details"><b>{person.name}</b><span>{person.detail}</span><div className="skill-tags">{person.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><p>Interests: {person.interests.join(", ") || "No interests added yet."}</p></div><div className="candidate-fit"><strong>{person.match}%</strong><span>overall fit</span><small>Skills · Interest · Time</small></div><button className={`button ${joined.includes(person.id) ? "button-light" : "button-dark"}`} onClick={() => toggleShortlist(person)}>{joined.includes(person.id) ? "✓ Shortlisted" : "＋ Shortlist"}</button></div>)}</section>}
        {active === "Contributions" && <section className="panel full-panel contribution-page"><div className="panel-heading"><div><h2>Contribution log</h2><p>A transparent, shared record of work completed and in progress.</p></div><button className="button button-dark" onClick={() => setLogged(true)}>＋ Log a contribution</button></div><div className="contribution-summary"><div><span>THIS WEEK</span><b>{myContributions.length} <small>updates</small></b></div><div><span>TEAM CONTRIBUTION</span><b>{myContributions.filter((entry) => entry.status === "reviewed").length}<small>reviewed</small></b></div><div><span>LAST UPDATED</span><b>{myContributions.length ? new Date(myContributions[0].createdAt).toLocaleDateString() : "—"} <small>last update</small></b></div></div><div className="log-filters"><span>ALL ACTIVITY</span><span>TEAM MEMBER <b>Everyone ⌄</b></span><span>DATE RANGE <b>{period} ⌄</b></span></div>{myContributions.length === 0 ? <div className="empty-matches">No contributions have been logged yet. Start the shared record with your first update.</div> : myContributions.map((entry) => <div className="log-entry" key={entry.id}><div className="activity-avatar avatar-user">{entry.author.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div className="log-copy"><b>{entry.author} <span>· {new Date(entry.createdAt).toLocaleString()}</span></b><p>{entry.task}</p><small>{entry.category} · {entry.hours}{entry.notes ? " · " + entry.notes : ""}</small></div><span className={"log-status " + (entry.status === "submitted" ? "pending-status" : "")}>{entry.status === "reviewed" ? "✓ Reviewed" : entry.status === "needs_changes" ? "Changes requested" : "◷ Submitted"}</span>{currentRole === "lead" && entry.status === "submitted" && <div className="review-controls"><button type="button" onClick={() => reviewContribution(entry, "reviewed")}>Review</button><button type="button" onClick={() => reviewContribution(entry, "needs_changes")}>Request changes</button></div>}</div>)}<div className="transparency-note">ⓘ &nbsp;Everyone on the team can see, comment on, and review these updates.</div></section>}
        <footer className="page-footer"><span>© 2026 Teamcraft</span><span>Made for teams that do good work together <i>✳</i></span><button onClick={() => notify("Help center opened")}>Help & support</button></footer>
      </div>
    </section>
    {toast && <div className="toast">✓ &nbsp;{toast}</div>}
    {profileModal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setProfileModal(false); }}><form className="log-modal profile-modal" onSubmit={saveProfile}>
      <div className="modal-top"><div><span className="match-eyebrow">YOUR ACCOUNT</span><h2>Edit profile</h2><p>Update the details teammates use to find and work with you.</p></div><button type="button" className="close-modal" onClick={() => setProfileModal(false)}>×</button></div>
      <label>Display name<input value={profileName} onChange={(event) => setProfileName(event.target.value)} required maxLength={80} /></label>
      <div className="skill-picker-field"><span className="skill-picker-label">Skills</span><details className="skill-picker"><summary>{profileSkills.length ? `${profileSkills.length} selected` : "Choose your skills"}</summary><div className="skill-options">{PROJECT_SKILL_OPTIONS.map((skill) => <label key={skill}><input type="checkbox" checked={profileSkills.includes(skill)} onChange={(event) => setProfileSkills((current) => event.target.checked ? [...current, skill] : current.filter((item) => item !== skill))} />{skill}</label>)}</div></details><label>Other skills <span className="optional">COMMA SEPARATED</span><input value={customProfileSkills} onChange={(event) => setCustomProfileSkills(event.target.value)} placeholder="Add skills not listed above" /></label></div>
      <div className="skill-picker-field"><span className="skill-picker-label">Interests</span><details className="skill-picker"><summary>{profileInterests.length ? `${profileInterests.length} selected` : "Choose your interests"}</summary><div className="skill-options">{PROFILE_INTEREST_OPTIONS.map((interest) => <label key={interest}><input type="checkbox" checked={profileInterests.includes(interest)} onChange={(event) => setProfileInterests((current) => event.target.checked ? [...current, interest] : current.filter((item) => item !== interest))} />{interest}</label>)}</div></details><label>Other interests <span className="optional">COMMA SEPARATED</span><input value={customProfileInterests} onChange={(event) => setCustomProfileInterests(event.target.value)} placeholder="Add interests not listed above" /></label></div>
      <label>Hours available each week<input type="number" min="0" max="168" value={profileWeeklyHours} onChange={(event) => setProfileWeeklyHours(event.target.value)} /></label>
      <label className="discoverable-check"><input type="checkbox" checked={profileDiscoverable} onChange={(event) => setProfileDiscoverable(event.target.checked)} /> Show my profile in teammate matching</label>
      {profileError && <div className="auth-error" role="alert">{profileError}</div>}
      <div className="modal-footer"><button type="button" className="signout-link" onClick={signOut}>Sign out</button><div><button type="button" className="text-link" onClick={() => setProfileModal(false)}>Cancel</button><button className="button button-dark" type="submit" disabled={profileBusy}>{profileBusy ? "Saving…" : "Save profile"} →</button></div></div>
    </form></div>}
    {logged && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !contributionBusy) setLogged(false); }}><form className="log-modal" onSubmit={publishContribution}><div className="modal-top"><div><span className="match-eyebrow">TEAM TRANSPARENCY</span><h2>Log a contribution</h2><p>Share a clear update so everyone can see how the project is moving.</p></div><button type="button" className="close-modal" onClick={() => !contributionBusy && setLogged(false)}>×</button></div><label>What did you work on?<input name="task" required placeholder="e.g. Interviewed 3 students" /></label><div className="modal-fields"><label>Category<select name="category" defaultValue="Research"><option>Research</option><option>Design</option><option>Development</option><option>Writing</option><option>Planning</option></select></label><label>Time spent<select name="hours" defaultValue="2 hours"><option>30 minutes</option><option>1 hour</option><option>2 hours</option><option>3 hours</option><option>4+ hours</option></select></label></div><label>Notes <span className="optional">OPTIONAL</span><textarea name="notes" placeholder="Add context, a link, or what you learned…" /></label><div className="modal-footer"><span>Published to the project’s shared contribution log</span><button className="button button-dark" type="submit" disabled={contributionBusy}>{contributionBusy ? "Saving…" : "Publish update →"}</button></div></form></div>}
    {actionModal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setActionModal(""); }}><form className="log-modal" onSubmit={submitAction}>
      <div className="modal-top"><div><span className="match-eyebrow">{actionModal === "invite" ? "GROW YOUR TEAM" : actionModal === "needs" ? "TEAM SKILLS" : "PROJECT WORKSPACE"}</span><h2>{actionModal === "project" ? "Create a project" : actionModal === "settings" ? "Project settings" : actionModal === "needs" ? "Edit project needs" : "Invite teammates"}</h2><p>{actionModal === "invite" ? `Share the six-digit join code for ${projectName}.` : actionModal === "needs" ? "Select the skills your team is looking for." : "Keep project needs, interests, and time expectations clear."}</p></div><button type="button" className="close-modal" onClick={() => setActionModal("")}>×</button></div>
      {inviteCode ? <div className="invite-code-result"><p>Share this project code with your teammates. They can enter it at <b>/join</b>.</p><code>{inviteCode}</code><button type="button" className="button button-dark" onClick={async () => { await navigator.clipboard.writeText(inviteCode); notify("Project code copied."); }}>Copy code</button></div> : <>
        {actionModal === "invite" ? <p className="invite-code-help">Anyone with this code can join <b>{projectName}</b>. The code is shared by everyone on the project team.</p> : actionModal === "needs" ? <><div className="skill-picker-field"><span className="skill-picker-label">Choose skills needed</span><details className="skill-picker"><summary>{selectedNeedSkills.length ? `${selectedNeedSkills.length} selected` : "Select project skills"}</summary><div className="skill-options">{PROJECT_SKILL_OPTIONS.map((skill) => <label key={skill}><input type="checkbox" checked={selectedNeedSkills.includes(skill)} onChange={(event) => setSelectedNeedSkills((current) => event.target.checked ? [...current, skill] : current.filter((item) => item !== skill))} />{skill}</label>)}</div></details></div><label>Other skills <span className="optional">OPTIONAL · COMMA SEPARATED</span><input type="text" value={customNeedSkills} onChange={(event) => setCustomNeedSkills(event.target.value)} placeholder="Add skills not listed above" /></label></> : <label>Project name<input type="text" required value={actionInput} onChange={(event) => setActionInput(event.target.value)} placeholder="e.g. Campus Connect" /></label>}
        {(actionModal === "settings" || actionModal === "project") && <><label>Project description<textarea value={actionDescription} onChange={(event) => setActionDescription(event.target.value)} placeholder="What is your team working on?" /></label><label>Project interests <span className="optional">COMMA SEPARATED</span><input value={actionInterests} onChange={(event) => setActionInterests(event.target.value)} placeholder="Student wellbeing, campus life" /></label><label>Hours needed from teammates each week<input type="number" min="0" max="168" value={actionHours} onChange={(event) => setActionHours(event.target.value)} /></label>{actionModal === "settings" && <><label>Project due date<input type="date" value={actionDueDate} onChange={(event) => setActionDueDate(event.target.value)} /></label><label>GitHub repository URL <span className="optional">OPTIONAL</span><input type="url" pattern="https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(\.git)?/?" title="Enter a GitHub repository URL, such as https://github.com/owner/repository" value={actionGithubRepoUrl} onChange={(event) => setActionGithubRepoUrl(event.target.value)} placeholder="https://github.com/owner/repository" /></label></>}</>}
        <div className="modal-footer"><span>{actionModal === "invite" ? "Your team’s six-digit code works for anyone who enters it." : "Changes are saved to the project database."}</span><button className="button button-dark" type="submit">{actionModal === "invite" ? "Show project code" : "Save changes"} →</button></div>
      </>}
    </form></div>}
  </main>;
}
