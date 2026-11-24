"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "../../lib/supabase/client";
import GitHubActivity from "../../components/GitHubActivity";
import DarkModeToggle from "../../components/DarkModeToggle";

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
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
  const [profileSkillLevels, setProfileSkillLevels] = useState({});
  const [customProfileSkills, setCustomProfileSkills] = useState("");
  const [profileInterests, setProfileInterests] = useState([]);
  const [customProfileInterests, setCustomProfileInterests] = useState("");
  const [profileWeeklyHours, setProfileWeeklyHours] = useState(5);
  const [profileDiscoverable, setProfileDiscoverable] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
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
  const [tasks, setTasks] = useState([]);
  const [taskBusy, setTaskBusy] = useState(false);
  const [peerTarget, setPeerTarget] = useState("");
  const [peerBusy, setPeerBusy] = useState(false);
  const [peerSummaries, setPeerSummaries] = useState([]);
  const [shortlistedOnly, setShortlistedOnly] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const shortlistedCandidates = opportunities.filter((person) => joined.includes(person.id));
  const visiblePeople = useMemo(() => teamMembers.filter((p) => `${p.name} ${p.role} ${p.skills.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [query, teamMembers]);
  const coveredSkills = projectNeeds.filter((skill) => teamMembers.some((member) => member.skills.some((item) => item.toLowerCase() === skill.toLowerCase())));
  const uncoveredSkills = projectNeeds.filter((skill) => !coveredSkills.includes(skill));
  const capacityTotal = teamMembers.reduce((sum, member) => sum + member.hours, 0);
  const coveragePercent = projectNeeds.length ? Math.round(coveredSkills.length / projectNeeds.length * 100) : 0;
  const singleOwnerSkills = projectNeeds.filter((skill) => teamMembers.filter((member) => member.skills.some((item) => item.toLowerCase() === skill.toLowerCase())).length === 1);
  const missingTaskCount = tasks.filter((task) => task.status !== "Completed").length;
  const overdueTaskCount = tasks.filter((task) => task.status !== "Completed" && task.due_date && new Date(`${task.due_date}T23:59:59`) < new Date()).length;
  const pendingReviewCount = myContributions.filter((entry) => entry.status === "submitted").length;
  const myTasks = tasks.filter((task) => task.assignee_id === userId);
  const myOpenTasks = myTasks.filter((task) => task.status !== "Completed");
  const myOverdueTasks = myOpenTasks.filter((task) => task.due_date && new Date(`${task.due_date}T23:59:59`) < new Date());
  const myContributionEntries = myContributions.filter((entry) => entry.userId === userId);
  const completedTaskCount = tasks.filter((task) => task.status === "Completed").length;
  const taskCompletionPercent = tasks.length ? Math.round(completedTaskCount / tasks.length * 100) : 0;
  const reportStart = new Date();
  if (period === "This week") {
    reportStart.setDate(reportStart.getDate() - ((reportStart.getDay() + 6) % 7));
  } else {
    reportStart.setDate(1);
  }
  reportStart.setHours(0, 0, 0, 0);
  const periodContributions = myContributions.filter((entry) => new Date(entry.createdAt) >= reportStart);
  const periodMinutes = periodContributions.reduce((sum, entry) => sum + Number.parseFloat(entry.hours || 0) * 60, 0);
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const loadNotifications = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await createClient().from("notifications").select("id, project_id, type, title, body, read_at, created_at").order("created_at", { ascending: false }).limit(20);
    if (!error) setNotifications(data || []);
  }, []);
  const unreadNotificationCount = notifications.filter((item) => !item.read_at).length;
  const markNotificationRead = async (notification) => {
    if (!notification.read_at) {
      const readAt = new Date().toISOString();
      const { error } = await createClient().from("notifications").update({ read_at: readAt }).eq("id", notification.id);
      if (error) return notify(error.message || "Could not update notification.");
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read_at: readAt } : item));
    }
  };
  const markAllNotificationsRead = async () => {
    const readAt = new Date().toISOString();
    const { error } = await createClient().from("notifications").update({ read_at: readAt }).is("read_at", null);
    if (error) return notify(error.message || "Could not mark notifications as read.");
    setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at || readAt })));
  };
  const navItems = ["Overview", "Team", "Tasks", "Matching", "Contributions"];

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;
    let alive = true;
    const refresh = async () => {
      if (!isSupabaseConfigured) return;
      const { data, error } = await createClient().from("notifications").select("id, project_id, type, title, body, read_at, created_at").order("created_at", { ascending: false }).limit(20);
      if (alive && !error) setNotifications(data || []);
    };
    refresh();
    const interval = window.setInterval(refresh, 30000);
    return () => { alive = false; window.clearInterval(interval); };
  }, [userId]);

  const loadProjectData = async (supabase, selectedProjectId, interestNeeds = [], hoursNeeded = 0, currentUserId = userId) => {
    const [memberResult, skillResult, contributionResult, candidateResult, shortlistResult, taskResult, peerSummaryResult] = await Promise.all([
      supabase.from("project_members").select("user_id, role, joined_at, profiles(display_name, skills, interests, weekly_hours, skill_levels)").eq("project_id", selectedProjectId),
      supabase.from("project_skills").select("skill").eq("project_id", selectedProjectId),
      supabase.from("contributions").select("id, user_id, title, category, minutes, notes, status, task_id, evidence_url, github_reference, created_at, profiles(display_name)").eq("project_id", selectedProjectId).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, display_name, skills, skill_levels, interests, weekly_hours").eq("discoverable", true).neq("id", currentUserId),
      supabase.from("project_shortlists").select("candidate_id").eq("project_id", selectedProjectId).eq("shortlisted_by", currentUserId),
      supabase.from("project_tasks").select("id, title, description, assignee_id, priority, status, due_date, created_at, profiles:profiles!project_tasks_assignee_id_fkey(display_name)").eq("project_id", selectedProjectId).order("due_date", { ascending: true, nullsFirst: false }),
      supabase.rpc("project_peer_summaries", { target_project: selectedProjectId }),
    ]);
    if (memberResult.error) throw memberResult.error;
    if (skillResult.error) throw skillResult.error;
    if (contributionResult.error) throw contributionResult.error;
    if (candidateResult.error) throw candidateResult.error;
    if (shortlistResult.error) throw shortlistResult.error;
    if (taskResult.error) throw taskResult.error;
    if (peerSummaryResult.error) throw peerSummaryResult.error;

    const minutesByUser = (contributionResult.data || []).reduce((totals, entry) => ({ ...totals, [entry.user_id]: (totals[entry.user_id] || 0) + entry.minutes }), {});
    setTeamMembers((memberResult.data || []).map((membership) => {
      const profile = membership.profiles || {};
      const name = profile.display_name || "Team member";
      const hours = profile.weekly_hours || 0;
      const contribution = hours ? Math.min(100, Math.round((minutesByUser[membership.user_id] || 0) / (hours * 60) * 100)) : 0;
      return { id: membership.user_id, name, initials: name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role: membership.role === "lead" ? "Project lead" : "Member", skills: profile.skills || [], skillLevels: profile.skill_levels || {}, interests: profile.interests || [], hours, color: membership.role === "lead" ? "coral" : "blue", contribution, status: membership.role === "lead" ? "Project lead" : "Project member" };
    }));
    setProjectNeeds((skillResult.data || []).map((item) => item.skill));
    setMyContributions((contributionResult.data || []).map((entry) => ({ id: entry.id, task: entry.title, category: entry.category, hours: `${Math.round(entry.minutes / 60 * 10) / 10} hrs`, notes: entry.notes, author: entry.profiles?.display_name || "Team member", userId: entry.user_id, status: entry.status, taskId: entry.task_id, evidenceUrl: entry.evidence_url, githubReference: entry.github_reference, createdAt: entry.created_at })));
    setJoined((shortlistResult.data || []).map((item) => item.candidate_id));
    setTasks((taskResult.data || []).map((task) => ({ ...task, assigneeName: task.profiles?.display_name || "Unassigned" })));
    setPeerSummaries(peerSummaryResult.data || []);
    const currentMemberIds = new Set((memberResult.data || []).map((membership) => membership.user_id));
    setOpportunities((candidateResult.data || []).filter((profile) => !currentMemberIds.has(profile.id)).map((profile) => {
      const profileSkills = profile.skills || [];
      const profileInterests = profile.interests || [];
      const neededSkills = (skillResult.data || []).map((item) => item.skill);
      const matchedSkills = profileSkills.filter((skill) => neededSkills.some((item) => item.toLowerCase() === skill.toLowerCase()));
      const teamGapSkills = neededSkills.filter((skill) => !(memberResult.data || []).some((membership) => (membership.profiles?.skills || []).some((item) => item.toLowerCase() === skill.toLowerCase())));
      const complementarySkills = teamGapSkills.filter((skill) => profileSkills.some((item) => item.toLowerCase() === skill.toLowerCase()));
      const coverageScore = neededSkills.length ? matchedSkills.length / neededSkills.length * 45 : 35;
      const complementScore = teamGapSkills.length ? complementarySkills.length / teamGapSkills.length * 15 : 0;
      const sharedInterestScore = interestNeeds.length ? profileInterests.filter((interest) => interestNeeds.some((item) => item.toLowerCase() === interest.toLowerCase())).length / interestNeeds.length * 20 : 15;
      const availabilityScore = hoursNeeded ? Math.min((profile.weekly_hours || 0) / hoursNeeded, 1) * 10 : ((profile.weekly_hours || 0) > 0 ? 10 : 0);
      const levelValues = matchedSkills.map((skill) => ({ Beginner: 1, Intermediate: 2, Advanced: 3 }[profile.skill_levels?.[skill] || "Beginner"]));
      const experienceScore = levelValues.length ? levelValues.reduce((sum, value) => sum + value, 0) / levelValues.length / 3 * 10 : 4;
      const name = profile.display_name || "Teamcraft member";
      return { id: profile.id, initials: name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), name, detail: `Discoverable · ${profile.weekly_hours || 0} hrs/week`, skills: profileSkills, skillLevels: profile.skill_levels || {}, interests: profileInterests, matchedSkills, reason: complementarySkills.length ? `Fills current team skill gaps: ${complementarySkills.slice(0, 3).join(", ")}` : `Strong fit for ${matchedSkills.slice(0, 3).join(", ") || "team availability"}`, breakdown: { skills: Math.round(coverageScore + complementScore), interests: Math.round(sharedInterestScore), availability: Math.round(availabilityScore), experience: Math.round(experienceScore) }, match: Math.min(100, Math.round(coverageScore + complementScore + sharedInterestScore + availabilityScore + experienceScore)), color: "gold" };
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
    const { data, error } = await createClient().from("profiles").select("display_name, skills, skill_levels, interests, weekly_hours, discoverable").eq("id", userId).single();
    if (error) {
      notify(error.message || "Could not load your profile.");
      return;
    }
    const skills = data.skills || [];
    const interests = data.interests || [];
    setProfileName(data.display_name || "");
    setProfileSkills(skills.filter((skill) => PROJECT_SKILL_OPTIONS.includes(skill)));
    setProfileSkillLevels(data.skill_levels || {});
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
        skill_levels: profileSkillLevels,
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
        skillLevels: profileSkillLevels,
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
    setInviteEmail("");
    setInviteLink("");
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
        if (inviteEmail.trim()) {
          const { data, error } = await supabase.from("project_invitations").insert({ project_id: projectId, email: inviteEmail.trim().toLowerCase(), invited_by: userId }).select("token").single();
          if (error) throw error;
          const link = `${window.location.origin}/invite/${data.token}`;
          setInviteLink(link);
          try {
            await navigator.clipboard.writeText(link);
            notify("Invitation link copied.");
          } catch { notify("Invitation link is ready to share."); }
        } else {
          const { data, error } = await supabase.from("projects").select("join_code").eq("id", projectId).single();
          if (error) throw error;
          setInviteCode(data.join_code);
          try {
            await navigator.clipboard.writeText(data.join_code);
            notify("Project code copied.");
          } catch { notify("Project code is ready to share."); }
        }
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
    notify(status === "reviewed" ? "Contribution approved" : status === "rejected" ? "Contribution rejected" : "Changes requested");
  };

  const publishContribution = async (event) => {
    event.preventDefault();
    if (contributionBusy) return;
    setContributionBusy(true);
    const form = new FormData(event.currentTarget);
    const hoursLabel = form.get("hours");
    const minutes = hoursLabel === "30 minutes" ? 30 : hoursLabel === "4+ hours" ? 240 : Number.parseInt(hoursLabel, 10) * 60;
    try {
      const { data, error } = await createClient().from("contributions").insert({ project_id: projectId, user_id: userId, title: form.get("task"), category: form.get("category"), minutes, notes: form.get("notes") || "", task_id: form.get("task_id") || null, evidence_url: form.get("evidence_url") || null, github_reference: form.get("github_reference") || null }).select("id, user_id, title, category, minutes, notes, status, task_id, evidence_url, github_reference, created_at").single();
      if (error) throw error;
      setMyContributions((entries) => [{ ...data, task: data.title, author: userName, userId: userId, hours: hoursLabel, createdAt: data.created_at }, ...entries]);
      setLogged(false);
      notify("Contribution saved to the project log");
    } catch (error) {
      notify(error.message || "Could not save contribution.");
    } finally {
      setContributionBusy(false);
    }
  };

  const createTask = async (event) => {
    event.preventDefault();
    if (taskBusy) return;
    setTaskBusy(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const { error } = await createClient().from("project_tasks").insert({
        project_id: projectId,
        title: String(form.get("title") || "").trim(),
        description: String(form.get("description") || "").trim(),
        assignee_id: form.get("assignee") || null,
        priority: form.get("priority"),
        due_date: form.get("due_date") || null,
        created_by: userId,
      });
      if (error) throw error;
      formElement.reset();
      await loadProjectData(createClient(), projectId, projectInterests, weeklyHoursNeeded, userId);
      notify("Task created.");
    } catch (error) {
      notify(error.message || "Could not create task. Apply the latest database migration first.");
    } finally {
      setTaskBusy(false);
    }
  };

  const updateTaskStatus = async (task, status) => {
    const { error } = await createClient().rpc("update_project_task_status", { task_id: task.id, next_status: status });
    if (error) return notify(error.message || "Could not update task status.");
    setTasks((items) => items.map((item) => item.id === task.id ? { ...item, status } : item));
    notify(`Task marked ${status.toLowerCase()}.`);
  };

  const submitPeerEvaluation = async (event) => {
    event.preventDefault();
    if (!peerTarget || peerBusy) return;
    setPeerBusy(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const { error } = await createClient().from("peer_evaluations").insert({
        project_id: projectId, evaluator_id: userId, evaluatee_id: peerTarget,
        participation: Number(form.get("participation")), communication: Number(form.get("communication")),
        reliability: Number(form.get("reliability")), collaboration: Number(form.get("collaboration")),
        responsibility: Number(form.get("responsibility")), feedback: String(form.get("feedback") || "").trim(),
      });
      if (error) throw error;
      formElement.reset();
      setPeerTarget("");
      notify("Private peer feedback submitted.");
    } catch (error) {
      notify(error.code === "23505" ? "You have already submitted feedback for this teammate." : error.message || "Could not submit feedback. Apply the latest database migration first.");
    } finally {
      setPeerBusy(false);
    }
  };

  if (!ready) return <main className="route-loading">Opening your workspace…</main>;
  if (!isSupabaseConfigured) return <main className="empty-workspace"><Link href="/" className="brand public-brand"><span className="brand-mark"><span>t</span></span><span>teamcraft</span></Link><div><span className="section-eyebrow">BACKEND CONNECTION REQUIRED</span><h1>Connect your Supabase project</h1><p>{backendError}</p><ol><li>Create a Supabase project.</li><li>Copy <b>.env.example</b> to <b>.env.local</b> and add your project URL and publishable key.</li><li>Run the migration in <b>supabase/migrations</b> in the Supabase SQL editor, then restart the dev server.</li></ol><button className="button button-dark" onClick={signOut}>Back to homepage</button></div></main>;
  if (backendError) return <main className="empty-workspace"><div><span className="section-eyebrow">WORKSPACE COULD NOT LOAD</span><h1>Check your backend setup</h1><p>{backendError}</p><button className="button button-dark" onClick={() => window.location.reload()}>Try again</button></div></main>;
  if (projects.length === 0) return <main className="empty-workspace"><Link href="/" className="brand public-brand"><span className="brand-mark"><span>t</span></span><span>teamcraft</span></Link><form className="first-project-card" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await createProjectRecord(form.get("name").trim(), form.get("description").trim(), String(form.get("interests") || "").split(",").map((item) => item.trim()).filter(Boolean), Number(form.get("hours_needed") || 0)); } catch (error) { setBackendError(error.message); } }}><span className="section-eyebrow">YOUR TEAM STARTS HERE</span>{notifications.length > 0 && <div className="setup-notifications"><b>Notifications ({unreadNotificationCount} unread)</b>{notifications.slice(0, 5).map((item) => <button className={item.read_at ? "" : "unread"} key={item.id} type="button" onClick={() => markNotificationRead(item)}><strong>{item.title}</strong><span>{item.body}</span></button>)}</div>}<h1>Create your first project</h1><p>When you create a project, you become its project lead. You can invite teammates after the project is set up.</p><label>Project name<input name="name" required minLength={2} placeholder="e.g. Campus Connect" /></label><label>What are you working on?<textarea name="description" placeholder="Share the goal for this project" /></label><label>Interests related to this project<input name="interests" placeholder="Student wellbeing, campus life" /></label><label>Hours needed from a teammate each week<input name="hours_needed" type="number" min="0" max="168" defaultValue="5" /></label>{backendError && <div className="auth-error">{backendError}</div>}<button className="button button-dark" type="submit">Create project and become lead →</button><button className="signout-link" type="button" onClick={signOut}>Sign out</button></form></main>;

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><span>t</span></div><span>teamcraft</span></div>
      <div className="workspace-label">WORKSPACE</div>
      <div className="workspace-switch"><span className="workspace-icon">✳</span><span className="workspace-name">{projectName}<small>{currentRole === "lead" ? "Project lead" : "Project member"}</small></span></div>
      <div className="nav-label">MENU</div>
      <nav aria-label="Workspace sections">{navItems.map((item, i) => <button key={item} title={item} aria-label={item} aria-current={active === item ? "page" : undefined} onClick={() => setActive(item)} className={`nav-item ${active === item ? "selected" : ""}`}><span className="nav-icon" aria-hidden="true">{["◫", "♙", "✓", "✳", "◷"][i]}</span>{item}</button>)}</nav>
      <div className="sidebar-projects"><div className="nav-label">YOUR PROJECTS <button className="plus" aria-label="Create project" onClick={() => openAction("project")}>＋</button></div>{projects.map((project, index) => <button key={project.id} className={`project-link ${projectName === project.name ? "current" : ""}`} onClick={() => selectProject(project)}><i className={`project-dot ${index % 3 === 1 ? "violet" : index % 3 === 2 ? "yellow" : ""}`}></i>{project.name}</button>)}</div>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon">✦</div><b>Better teams start here.</b><p>Build a team around what people bring to the table.</p><button onClick={() => notify("Tip: start with the skills and weekly hours your project needs.")}>Explore the guide <span>↗</span></button></div><button className="profile" onClick={openProfile}><div className="avatar avatar-user">{userName.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><span><b>{userName}</b><small>{currentRole === "lead" ? "Project lead" : "Project member"} · Edit profile</small></span><span className="more">↗</span></button></div>
    </aside>

    <section className="main-area">
      <header className="topbar"><div className="breadcrumbs">My projects <span>/</span> <b>{projectName}</b></div><div className="top-actions"><DarkModeToggle /><div className="notification-area"><button className="icon-button" aria-label={`Notifications${unreadNotificationCount ? `, ${unreadNotificationCount} unread` : ""}`} onClick={() => { setNotificationsOpen((open) => !open); loadNotifications(); }}>♧{unreadNotificationCount > 0 && <i className="notification-count">{unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}</i>}</button>{notificationsOpen && <div className="notifications-menu"><div className="notifications-menu-heading"><b>Notifications</b>{unreadNotificationCount > 0 && <button onClick={markAllNotificationsRead}>Mark all read</button>}</div>{notifications.length ? notifications.map((item) => <button className={`notification-item ${item.read_at ? "" : "unread"}`} key={item.id} onClick={() => markNotificationRead(item)}><i></i><span><b>{item.title}</b><small>{item.body}</small><time>{new Date(item.created_at).toLocaleString()}</time></span></button>) : <p className="notifications-empty">You’re all caught up.</p>}</div>}</div><div className="top-divider"></div><button className="avatar avatar-user small-user" aria-label="Edit profile" title="Edit profile" onClick={openProfile}>{userName.split(" ").map((part) => part[0]).join("").slice(0, 2)}</button></div></header>
      <div className="content-wrap">
        <div className="project-heading"><div><div className="eyebrow"><span className="live-dot"></span> IN PROGRESS <span className="eyebrow-separator">·</span> {currentRole === "lead" ? "PROJECT LEAD" : "PROJECT MEMBER"}</div><h1>{projectName}</h1><p className="subtitle">{projectDescription}</p>{githubRepoUrl && <a className="github-repo-link" href={githubRepoUrl} target="_blank" rel="noreferrer">GitHub repository ↗</a>}</div><div className="heading-actions">{currentRole === "lead" && <><button className="button button-light" onClick={() => openAction("settings")}>⚙ <span>Settings</span></button><button className="button button-dark" onClick={() => openAction("invite")}>＋ <span>Invite people</span></button></>}</div></div>
        <div className="project-meta"><span>◷ &nbsp;Created {projects.find((item) => item.id === projectId)?.created_at ? new Date(projects.find((item) => item.id === projectId).created_at).toLocaleDateString() : "Today"}</span><span className="meta-divider"></span><span>◎ &nbsp;{projectDueDate ? `Due ${new Date(`${projectDueDate}T00:00:00`).toLocaleDateString()}` : "No due date set"}</span><span className="meta-divider"></span><span className="meta-avatars">{teamMembers.slice(0, 4).map((member) => <i key={member.id} className={"avatar mini " + member.color}>{member.initials}</i>)}</span><span>{teamMembers.length} members</span><span className="meta-divider"></span><span className="privacy-pill">♙ &nbsp;Private</span></div>

      <div className="stats-grid"><article className="stat-card"><div className="stat-top"><span>SKILL COVERAGE</span><span className="stat-symbol green-symbol">◉</span></div><div className="stat-value">{coveragePercent}<span className="stat-unit">%</span></div><div className="stat-note">Of project skills covered by this team</div><div className="balance-bar"><i style={{ width: coveragePercent + "%" }}></i></div></article><article className="stat-card"><div className="stat-top"><span>WEEKLY CAPACITY</span><span className="stat-symbol blue-symbol">◷</span></div><div className="stat-value">{capacityTotal}<span className="stat-unit"> hrs</span></div><div className="stat-note">team availability · {weeklyHoursNeeded || 0} hrs needed</div><div className="capacity-bar"><i style={{ width: `${weeklyHoursNeeded ? Math.min(100, Math.round(capacityTotal / weeklyHoursNeeded * 100)) : 0}%` }}></i></div></article><article className="stat-card"><div className="stat-top"><span>CONTRIBUTIONS</span><span className="stat-symbol purple-symbol">↗</span></div><div className="stat-value">{myContributions.length}<span className="stat-unit"> updates</span></div><div className="stat-note">Shared project contribution log</div><div className="sparkline"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></article></div>

        <div className="tabs-row"><div className="tabs">{navItems.map((item) => <button key={item} onClick={() => setActive(item)} className={active === item ? "tab-active" : ""}>{item}{item === "Team" && <span>{teamMembers.length}</span>}</button>)}</div><button className="period-select" onClick={() => setPeriod(period === "This week" ? "This month" : "This week")}>▦ &nbsp;{period} <span>⌄</span></button></div>

        {active === "Overview" && currentRole !== "lead" && <section className="member-dashboard"><div className="member-dashboard-heading"><div><span className="section-eyebrow">YOUR TEAMCRAFT DASHBOARD</span><h2>Welcome back, {userName}</h2><p>Here’s your work and contribution status for {projectName}.</p></div><button className="button button-dark" onClick={() => setLogged(true)}>＋ Log contribution</button></div><div className="member-dashboard-stats"><article><b>{myOpenTasks.length}</b><span>open assigned tasks</span></article><article className={myOverdueTasks.length ? "overdue" : ""}><b>{myOverdueTasks.length}</b><span>overdue tasks</span></article><article><b>{myContributionEntries.filter((entry) => entry.status === "reviewed").length}</b><span>approved contributions</span></article><article><b>{myContributionEntries.filter((entry) => entry.status === "submitted").length}</b><span>awaiting review</span></article></div><div className="member-dashboard-panels"><section><div className="member-panel-heading"><div><h3>My assigned tasks</h3><p>Update progress as you work.</p></div><button className="text-link" onClick={() => setActive("Tasks")}>View all tasks →</button></div>{myTasks.length ? myTasks.slice(0, 4).map((task) => <div className="my-task-row" key={task.id}><div><b>{task.title}</b><span>{task.priority} priority · {task.due_date ? `Due ${new Date(`${task.due_date}T00:00:00`).toLocaleDateString()}` : "No deadline"}</span></div><select aria-label={`Update status for ${task.title}`} value={task.status} onChange={(event) => updateTaskStatus(task, event.target.value)}>{["To Do", "In Progress", "In Review", "Completed"].map((status) => <option key={status}>{status}</option>)}</select></div>) : <p className="member-dashboard-empty">No tasks are assigned to you yet. Your project lead can assign tasks from the Tasks section.</p>}</section><section><div className="member-panel-heading"><div><h3>My contributions</h3><p>Approved work is marked as verified.</p></div><button className="text-link" onClick={() => setActive("Contributions")}>Contribution log →</button></div>{myContributionEntries.length ? myContributionEntries.slice(0, 3).map((entry) => <div className="my-contribution-row" key={entry.id}><b>{entry.task}</b><span>{entry.status === "reviewed" ? "✓ Approved" : entry.status === "needs_changes" ? "Changes requested" : entry.status === "rejected" ? "Rejected" : "◷ Awaiting review"}</span></div>) : <p className="member-dashboard-empty">You haven’t logged a contribution yet. Add an update when you finish a piece of work.</p>}</section></div></section>}
        {active === "Overview" && githubRepoUrl && <GitHubActivity projectId={projectId} repositoryUrl={githubRepoUrl} />}
        {active === "Overview" && currentRole === "lead" && <section className="dashboard-focus"><div className="dashboard-focus-heading"><div><span className="section-eyebrow">YOUR NEXT MOVES</span><h2>Keep the project moving</h2><p>Quick actions based on the team’s current activity.</p></div><span className="focus-period">{period} · live</span></div><div className="focus-actions"><button onClick={() => setActive(uncoveredSkills.length ? "Matching" : "Team")}><span className="focus-icon">✳</span><span><b>{uncoveredSkills.length ? `Find skills for ${uncoveredSkills[0]}` : "Review team coverage"}</b><small>{uncoveredSkills.length ? `${uncoveredSkills.length} project skill${uncoveredSkills.length === 1 ? "" : "s"} still need coverage` : `${coveragePercent}% of project skills covered`}</small></span><i>→</i></button><button onClick={() => setActive(pendingReviewCount ? "Contributions" : "Tasks")}><span className="focus-icon focus-icon-blue">◷</span><span><b>{pendingReviewCount ? `Review ${pendingReviewCount} contribution${pendingReviewCount === 1 ? "" : "s"}` : overdueTaskCount ? `Check ${overdueTaskCount} overdue task${overdueTaskCount === 1 ? "" : "s"}` : "Check project progress"}</b><small>{pendingReviewCount ? "Team updates are waiting for your review" : overdueTaskCount ? "A quick check-in may help unblock the team" : `${taskCompletionPercent}% of tasks completed`}</small></span><i>→</i></button><button onClick={() => openAction("invite")}><span className="focus-icon focus-icon-gold">＋</span><span><b>Bring in a teammate</b><small>{teamMembers.length} people on this project · invite someone new</small></span><i>→</i></button></div></section>}{active === "Overview" && <div className="dashboard-grid"><div className="left-column">
          <section className="panel contribution-panel"><div className="panel-heading"><div><h2>Contribution balance</h2><p>How the work is shared across your team</p></div><button className="text-link" onClick={() => setActive("Contributions")}>View activity <span>↗</span></button></div><div className="chart-wrap"><div className="chart-y"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div className="chart-main"><div className="chart-lines"><i></i><i></i><i></i><i></i><i></i></div><div className="bars">{visiblePeople.map((p, i) => <div className="bar-group" key={p.name}><div className="bar-stack"><i className={`bar-seg seg-${i}`} style={{ height: `${p.contribution * .62}%` }}></i><i className={`bar-seg muted-seg seg-${i}`} style={{ height: `${(100 - p.contribution) * .62}%` }}></i></div><div className="bar-name"><span className={`avatar chart-avatar ${p.color}`}>{p.initials}</span><span>{p.name.split(" ")[0]}</span></div></div>)}</div><div className="chart-legend"><span><i className="legend-current"></i> Contributions logged</span><span><i className="legend-expected"></i> Expected share</span></div></div></div></section>
          <section className="panel team-panel"><div className="panel-heading"><div><h2>Your team <span className="heading-count">{String(teamMembers.length).padStart(2, "0")}</span></h2><p>Skills, roles, and weekly availability</p></div><button className="text-link" onClick={() => setActive("Team")}>See all <span>→</span></button></div><div className="team-table"><div className="table-head"><span>MEMBER</span><span>PROJECT SKILL MATCH</span><span>AVAILABILITY</span><span>CONTRIBUTION</span></div>{visiblePeople.slice(0, 4).map((person) => <div className="team-row" key={person.name}><div className="member-cell"><div className={`avatar ${person.color}`}>{person.initials}</div><div><b>{person.name}</b><small>{person.status === "On track" ? "Active this week" : person.status}</small></div></div><div className="role-cell"><b>{person.role}</b><small className="skill-match-summary">{projectNeeds.length ? `${memberSkillMatches(person, projectNeeds).length} of ${projectNeeds.length} needs matched` : "No project skills set"}</small><div className="skill-tags">{person.skills.slice(0, 2).map((s) => <span key={s} className={isProjectSkillMatch(s, projectNeeds) ? "skill-match" : "skill-unmatched"}>{s} · {person.skillLevels?.[s] || "Beginner"}</span>)}</div></div><div className="availability-cell"><b>{person.hours} hrs</b><small>per week</small></div><div className="contribution-cell"><div className="contribution-line"><div className="mini-progress"><i style={{ width: `${person.contribution}%` }}></i></div><b>{person.contribution}%</b></div><small>{person.status === "On track" ? "On track" : "Check in"}</small></div></div>)}</div></section>
          <section className="panel activity-panel"><div className="panel-heading"><div><h2>Latest activity</h2><p>A shared record of work in progress</p></div><button className="text-link" onClick={() => setActive("Contributions")}>View all <span>→</span></button></div><div className="activity-list">{myContributions.slice(0, 2).map((entry) => <div className="activity-item" key={entry.id}><div className="activity-avatar avatar-user">{entry.author.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div><p><b>{entry.author}</b> logged a contribution</p><small>{entry.task}</small></div><time>{new Date(entry.createdAt).toLocaleDateString()}</time></div>)}</div><button className="log-contribution" onClick={() => setLogged(true)}>＋ &nbsp; Log a contribution</button></section>
        </div><aside className="right-column"><section className="panel needs-panel"><div className="panel-heading"><div><h2>Project needs</h2><p>Keep the right skills in focus</p></div>{currentRole === "lead" && <button className="more-button" onClick={() => openAction("needs")}>···</button>}</div><div className="needs-progress"><span>TEAM COVERAGE</span><b>{coveredSkills.length} of {projectNeeds.length} skills</b></div><div className="coverage-track"><i style={{ width: `${coveragePercent}%` }}></i></div><div className="covered-skills">{coveredSkills.map((skill) => <span className="covered" key={skill}>✓ &nbsp;{skill}</span>)}{uncoveredSkills.map((skill) => <span className="needed" key={skill}>＋ &nbsp;{skill}</span>)}</div>{currentRole === "lead" && <button className="outline-button" onClick={() => openAction("needs")}>Edit project needs <span>↗</span></button>}</section>
          <section className="panel matches-panel"><div className="panel-heading"><div><div className="match-eyebrow">✳ &nbsp;SMART MATCHING</div><h2>People to meet</h2><p>Ranked by your project needs</p></div><button className="match-arrow" onClick={() => setActive("Matching")}>↗</button></div>{opportunities.slice(0, 3).map((person) => <div className="match-row" key={person.id}><div className={`avatar ${person.color}`}>{person.initials}</div><div className="match-person"><b>{person.name}</b><small>{person.detail}</small><div className="skill-tags match-tags">{person.skills.slice(0, 2).map((skill) => <span key={skill}>{skill}</span>)}</div></div><div className="match-score">{person.match}<small>% match</small></div><button className={`add-match ${joined.includes(person.id) ? "added" : ""}`} aria-label={`Shortlist ${person.name}`} onClick={() => toggleShortlist(person)}>{joined.includes(person.id) ? "✓" : "+"}</button></div>)}{opportunities.length === 0 && <p className="match-empty-note">No discoverable profiles yet.</p>}<button className="all-matches" onClick={() => setActive("Matching")}>Explore all matches <span>→</span></button></section>
          <section className="panel health-panel"><div className="panel-heading"><div><h2>Team health</h2><p>Live indicators from this project</p></div></div><div className="health-metrics"><span><b>{coveragePercent}%</b> skill coverage</span><span><b>{capacityTotal}/{weeklyHoursNeeded || "—"}</b> weekly hours</span><span><b>{taskCompletionPercent}%</b> tasks complete</span><span><b>{pendingReviewCount}</b> reviews waiting</span><span className={overdueTaskCount ? "task-overdue" : ""}><b>{overdueTaskCount}</b> overdue tasks</span></div><p>{uncoveredSkills.length ? `Recruit for ${uncoveredSkills.join(", ")}.` : singleOwnerSkills.length ? `Find backup for ${singleOwnerSkills.join(", ")}.` : "Skill coverage is balanced."} {pendingReviewCount ? `${pendingReviewCount} contribution${pendingReviewCount === 1 ? " is" : "s are"} waiting for review.` : "No contributions are waiting for review."} {overdueTaskCount ? `${overdueTaskCount} task${overdueTaskCount === 1 ? " is" : "s are"} overdue.` : "No tasks are overdue."}</p><button className="text-link" onClick={() => setActive("Tasks")}>Review team tasks →</button></section><section className="insight-card"><div className="insight-icon">✦</div><div><span>TEAM INSIGHT</span><p>{uncoveredSkills.length ? <>Your team needs <b>{uncoveredSkills.join(", ")}</b>.</> : singleOwnerSkills.length ? <>Consider backup coverage for <b>{singleOwnerSkills.join(", ")}</b>.</> : <>Your team covers all listed skills with shared ownership.</>}</p><button onClick={() => setActive("Matching")}>Find a match <span>→</span></button></div></section></aside></div>}
        {active === "Team" && <section className="panel full-panel"><div className="panel-heading"><div><h2>Team members</h2><p>Build a balanced team around people's strengths and schedules.</p></div>{currentRole === "lead" && <button className="button button-dark" onClick={() => openAction("invite")}>＋ Invite people</button>}</div><div className="search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people, roles, or skills" /></div><div className="team-table full-table"><div className="table-head"><span>MEMBER</span><span>PROJECT SKILL MATCH</span><span>AVAILABILITY</span><span>CONTRIBUTION</span></div>{visiblePeople.map((person) => <div className="team-row" key={person.name}><div className="member-cell"><div className={`avatar ${person.color}`}>{person.initials}</div><div><b>{person.name}</b><small>{person.status}</small></div></div><div className="role-cell"><b>{person.role}</b><small className="skill-match-summary">{projectNeeds.length ? `${memberSkillMatches(person, projectNeeds).length} of ${projectNeeds.length} needs matched` : "No project skills set"}</small><div className="skill-tags">{person.skills.map((s) => <span key={s} className={isProjectSkillMatch(s, projectNeeds) ? "skill-match" : "skill-unmatched"}>{s} · {person.skillLevels?.[s] || "Beginner"}</span>)}</div></div><div className="availability-cell"><b>{person.hours} hrs</b><small>per week</small></div><div className="contribution-cell"><div className="contribution-line"><div className="mini-progress"><i style={{ width: `${person.contribution}%` }}></i></div><b>{person.contribution}%</b></div><small>Contribution share</small>{currentRole === "lead" && person.role !== "Project lead" && <div className="member-controls"><button type="button" onClick={() => transferLead(person.id)}>Make lead</button><button type="button" onClick={() => removeMember(person)}>Remove</button></div>}</div></div>)}</div></section>}
        {active === "Team" && <section className="panel full-panel team-intelligence"><div className="panel-heading"><div><h2>Team intelligence</h2><p>Skill coverage, dependencies, workload, and private peer feedback.</p></div></div><div className="intelligence-grid"><article><b>{coveragePercent}%</b><span>project skill coverage</span></article><article><b>{singleOwnerSkills.length}</b><span>skills held by one member</span></article><article><b>{capacityTotal} / {weeklyHoursNeeded || "—"}</b><span>weekly hours available / needed</span></article><article><b>{tasks.filter((task) => task.status === "Completed").length} / {tasks.length}</b><span>tasks completed</span></article></div><p className="intelligence-note">{uncoveredSkills.length ? `Missing project skills: ${uncoveredSkills.join(", ")}.` : projectNeeds.length ? `Your team covers all ${projectNeeds.length} project skills.` : "Add project skill needs to see coverage insights."}{singleOwnerSkills.length ? ` ${singleOwnerSkills.length} skills depend on one member: ${singleOwnerSkills.join(", ")}.` : " No single-member skill dependencies detected."}</p><div className="skill-distribution">{projectNeeds.map((skill) => { const owners = teamMembers.filter((member) => member.skills.some((item) => item.toLowerCase() === skill.toLowerCase())); return <div key={skill}><span>{skill}</span><span>{owners.length ? owners.map((owner) => owner.name).join(", ") : "No team coverage"}</span><b className={owners.length === 1 ? "risk" : owners.length > 1 ? "covered" : "missing"}>{owners.length} {owners.length === 1 ? "owner" : "owners"}</b></div>; })}</div><div className="member-workload"><h3>Member workload</h3>{teamMembers.map((member) => { const openTasks = tasks.filter((task) => task.assignee_id === member.id && task.status !== "Completed").length; const approved = myContributions.filter((entry) => entry.status === "reviewed" && entry.userId === member.id).length; const width = tasks.length ? Math.round(openTasks / tasks.length * 100) : 0; return <div key={member.id}><span>{member.name}</span><span>{openTasks} open tasks · {approved} approved contributions</span><i><b style={{ width: `${width}%` }} /></i></div>; })}</div><div className="peer-summaries"><h3>Anonymous peer summaries</h3><p>Ratings appear after at least three teammates respond. Written comments remain private to their author.</p>{peerSummaries.length ? peerSummaries.map((summary) => <div key={summary.evaluatee_id}><b>{teamMembers.find((member) => member.id === summary.evaluatee_id)?.name || "Team member"}</b><span>{summary.response_count} responses</span><small>Participation {summary.participation} · Communication {summary.communication} · Reliability {summary.reliability} · Collaboration {summary.collaboration} · Responsibility {summary.responsibility}</small></div>) : <small>Peer summaries will appear when a teammate has three or more responses.</small>}</div><form className="peer-review-form" onSubmit={submitPeerEvaluation}><h3>Give a teammate private feedback</h3><p>Ratings and written feedback are private to you. Submit once per teammate.</p><label>Teammate<select value={peerTarget} onChange={(event) => setPeerTarget(event.target.value)} required><option value="">Choose a teammate</option>{teamMembers.filter((member) => member.id !== userId).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><div className="peer-rating-grid">{["participation", "communication", "reliability", "collaboration", "responsibility"].map((label) => <label key={label}>{label[0].toUpperCase() + label.slice(1)}<select name={label} defaultValue="4">{[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score} / 5</option>)}</select></label>)}</div><label>Feedback (optional)<textarea name="feedback" maxLength="2000" placeholder="Share constructive observations…" /></label><button className="button button-dark" disabled={peerBusy || !peerTarget}>{peerBusy ? "Submitting…" : "Submit private feedback"}</button></form></section>}
        {active === "Tasks" && <section className="panel full-panel tasks-page"><div className="panel-heading"><div><h2>Project tasks</h2><p>Assign work, track deadlines, and link completed tasks to contribution updates.</p></div></div><div className="task-summary"><span>{tasks.length} total tasks</span><span>{missingTaskCount} pending</span><span className={overdueTaskCount ? "task-overdue" : ""}>{overdueTaskCount} overdue</span></div>{currentRole === "lead" && <form className="task-create-form" onSubmit={createTask}><label>Task title<input name="title" required minLength="2" maxLength="180" placeholder="e.g. Draft interview guide" /></label><label>Description<textarea name="description" placeholder="What does done look like?" /></label><div className="task-form-row"><label>Assignee<select name="assignee" defaultValue=""><option value="">Unassigned</option>{teamMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label>Priority<select name="priority" defaultValue="Medium"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label><label>Deadline<input name="due_date" type="date" /></label></div><button className="button button-dark" disabled={taskBusy}>{taskBusy ? "Creating…" : "＋ Create task"}</button></form>}{tasks.length === 0 ? <div className="empty-matches">No tasks yet. {currentRole === "lead" ? "Create the first task above." : "Your project lead can add tasks here."}</div> : <div className="task-list">{tasks.map((task) => <article className="task-card" key={task.id}><div className="task-card-main"><div><span className={`task-priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span><h3>{task.title}</h3><p>{task.description || "No description provided."}</p></div><div className="task-meta"><span>{task.assigneeName}</span><span>{task.due_date ? `Due ${new Date(`${task.due_date}T00:00:00`).toLocaleDateString()}` : "No deadline"}</span></div></div><div className="task-controls"><b>{task.status}</b><select aria-label={`Update status for ${task.title}`} value={task.status} disabled={task.assignee_id && task.assignee_id !== userId && currentRole !== "lead"} onChange={(event) => updateTaskStatus(task, event.target.value)}>{["To Do", "In Progress", "In Review", "Completed"].map((status) => <option key={status}>{status}</option>)}</select></div></article>)}</div>}</section>}
        {active === "Matching" && <section className="panel full-panel matching-page"><div className="panel-heading"><div><div className="match-eyebrow">✳ &nbsp;SKILL + INTEREST + AVAILABILITY</div><h2>Find your next teammate</h2><p>Ranked by skill coverage, complementary expertise, experience, interests, and available hours.</p></div>{currentRole === "lead" && <button className="button button-dark" onClick={() => openAction("invite")}>＋ Share join code</button>}</div><div className="match-filters"><span>Skills: <b>{projectNeeds.join(", ") || "Open to any skill"}</b></span><span>Interests: <b>{projectInterests.join(", ") || "Open to any interest"}</b></span><span>Hours needed: <b>{weeklyHoursNeeded || "Flexible"} hrs/week</b></span><button onClick={() => setShortlistedOnly((value) => !value)}>{shortlistedOnly ? "✓ Showing shortlisted" : `Shortlisted (${joined.length})`}</button></div>{shortlistedCandidates.length >= 2 && <div className="candidate-compare"><h3>Compare shortlisted candidates</h3><div className="compare-row" style={{ gridTemplateColumns: `145px repeat(${shortlistedCandidates.length}, minmax(130px, 1fr))` }}><b>Candidate</b>{shortlistedCandidates.map((person) => <strong key={person.id}>{person.name}</strong>)}</div><div className="compare-row" style={{ gridTemplateColumns: `145px repeat(${shortlistedCandidates.length}, minmax(130px, 1fr))` }}><b>Overall fit</b>{shortlistedCandidates.map((person) => <span key={person.id}>{person.match}%</span>)}</div><div className="compare-row" style={{ gridTemplateColumns: `145px repeat(${shortlistedCandidates.length}, minmax(130px, 1fr))` }}><b>Skill contribution</b>{shortlistedCandidates.map((person) => <span key={person.id}>{person.matchedSkills.join(", ") || "Complementary fit"}</span>)}</div><div className="compare-row" style={{ gridTemplateColumns: `145px repeat(${shortlistedCandidates.length}, minmax(130px, 1fr))` }}><b>Interests</b>{shortlistedCandidates.map((person) => <span key={person.id}>{person.interests.join(", ") || "Not listed"}</span>)}</div><div className="compare-row" style={{ gridTemplateColumns: `145px repeat(${shortlistedCandidates.length}, minmax(130px, 1fr))` }}><b>Availability</b>{shortlistedCandidates.map((person) => <span key={person.id}>{person.detail.replace("Discoverable · ", "")}</span>)}</div></div>}{opportunities.length === 0 ? <div className="empty-matches"><b>No discoverable profiles yet</b><p>Ask teammates to add their skills, interests, and availability, then opt in to matching when they create their account.</p></div> : opportunities.filter((person) => (!shortlistedOnly || joined.includes(person.id)) && (!query || `${person.name} ${person.detail} ${person.skills.join(" ")} ${person.interests.join(" ")}`.toLowerCase().includes(query.toLowerCase()))).map((person) => <div className="candidate-card" key={person.id}><div className={`avatar candidate-avatar ${person.color}`}>{person.initials}</div><div className="candidate-details"><b>{person.name}</b><span>{person.detail}</span><div className="skill-tags">{person.skills.map((skill) => <span key={skill}>{skill} · {person.skillLevels?.[skill] || "Beginner"}</span>)}</div><p>Interests: {person.interests.join(", ") || "No interests added yet."}</p><p className="match-explanation">{person.reason}</p><div className="candidate-breakdown"><span>Skill + complement <b>{person.breakdown.skills}%</b></span><span>Interests <b>{person.breakdown.interests}%</b></span><span>Availability <b>{person.breakdown.availability}%</b></span><span>Experience <b>{person.breakdown.experience}%</b></span></div></div><div className="candidate-fit"><strong>{person.match}%</strong><span>overall fit</span><small>Skills · Interest · Time</small></div><button className={`button ${joined.includes(person.id) ? "button-light" : "button-dark"}`} onClick={() => toggleShortlist(person)}>{joined.includes(person.id) ? "✓ Shortlisted" : "＋ Shortlist"}</button></div>)}</section>}
        {active === "Contributions" && <section className="panel full-panel contribution-page"><div className="panel-heading"><div><h2>Contribution log</h2><p>A transparent, shared record of work completed and in progress.</p></div><button className="button button-dark" onClick={() => setLogged(true)}>＋ Log a contribution</button></div><div className="contribution-summary"><div><span>SUBMITTED</span><b>{myContributions.filter((entry) => entry.status === "submitted").length} <small>awaiting review</small></b></div><div><span>APPROVED</span><b>{myContributions.filter((entry) => entry.status === "reviewed").length}<small>verified</small></b></div><div><span>LAST UPDATED</span><b>{myContributions.length ? new Date(myContributions[0].createdAt).toLocaleDateString() : "—"} <small>last update</small></b></div><div><span>{period.toUpperCase()} REPORT</span><b>{periodContributions.length}<small> updates · {Math.round(periodMinutes)} min logged</small></b></div></div><div className="log-filters"><span>ALL ACTIVITY</span><span>TEAM MEMBER <b>Everyone</b></span><span>REVIEW STATUS <b>All contributions</b></span></div>{myContributions.length === 0 ? <div className="empty-matches">No contributions have been logged yet. Start the shared record with your first update.</div> : myContributions.map((entry) => <div className="log-entry" key={entry.id}><div className="activity-avatar avatar-user">{entry.author.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div className="log-copy"><b>{entry.author} <span>· {new Date(entry.createdAt).toLocaleString()}</span></b><p>{entry.task}</p><small>{entry.category} · {entry.hours}{entry.taskId ? ` · Task linked` : ""}{entry.notes ? " · " + entry.notes : ""}</small>{entry.evidenceUrl && <a href={entry.evidenceUrl} target="_blank" rel="noreferrer">Evidence ↗</a>}{entry.githubReference && <a href={entry.githubReference} target="_blank" rel="noreferrer">GitHub reference ↗</a>}</div><span className={"log-status " + (entry.status === "submitted" ? "pending-status" : "")}>{entry.status === "reviewed" ? "✓ Reviewed" : entry.status === "needs_changes" ? "Changes requested" : entry.status === "rejected" ? "Rejected" : "◷ Submitted"}</span>{currentRole === "lead" && entry.status === "submitted" && <div className="review-controls"><button type="button" onClick={() => reviewContribution(entry, "reviewed")}>Review</button><button type="button" onClick={() => reviewContribution(entry, "needs_changes")}>Request changes</button><button type="button" onClick={() => reviewContribution(entry, "rejected")}>Reject</button></div>}</div>)}<div className="transparency-note">ⓘ &nbsp;Project members can view updates. Only project leads can approve, request changes, or reject submissions.</div></section>}
        <footer className="page-footer"><span>© 2026 Teamcraft</span><span>Made for teams that do good work together <i>✳</i></span><button onClick={() => notify("Help center opened")}>Help & support</button></footer>
      </div>
    </section>
    {toast && <div className="toast">✓ &nbsp;{toast}</div>}
    {profileModal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setProfileModal(false); }}><form className="log-modal profile-modal" onSubmit={saveProfile}>
      <div className="modal-top"><div><span className="match-eyebrow">YOUR ACCOUNT</span><h2>Edit profile</h2><p>Keep your profile details, skills, and availability up to date.</p></div><button type="button" className="close-modal" onClick={() => setProfileModal(false)}>×</button></div>
      <div className="profile-form-content">
        <label className="profile-name-field">Display name<input value={profileName} onChange={(event) => setProfileName(event.target.value)} required maxLength={80} /></label>
        <div className="profile-preference-grid">
          <section className="profile-section"><div className="profile-section-heading"><span>01</span><div><b>Skills</b><small>What you can contribute</small></div></div><div className="skill-picker-field"><details className="skill-picker"><summary>{profileSkills.length ? `${profileSkills.length} selected` : "Choose your skills"}</summary><div className="skill-options">{PROJECT_SKILL_OPTIONS.map((skill) => <label key={skill}><input type="checkbox" checked={profileSkills.includes(skill)} onChange={(event) => setProfileSkills((current) => event.target.checked ? [...current, skill] : current.filter((item) => item !== skill))} />{skill}</label>)}</div></details><label>Other skills <span className="optional">COMMA SEPARATED</span><input value={customProfileSkills} onChange={(event) => setCustomProfileSkills(event.target.value)} placeholder="Add another skill" /></label></div>{profileSkills.length > 0 && <div className="proficiency-fields"><span className="skill-picker-label">Proficiency</span>{profileSkills.map((skill) => <label key={skill}><span>{skill}</span><select value={profileSkillLevels[skill] || "Beginner"} onChange={(event) => setProfileSkillLevels((levels) => ({ ...levels, [skill]: event.target.value }))}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>)}</div>}</section>
          <section className="profile-section"><div className="profile-section-heading"><span>02</span><div><b>Interests</b><small>Topics you care about</small></div></div><div className="skill-picker-field"><details className="skill-picker"><summary>{profileInterests.length ? `${profileInterests.length} selected` : "Choose your interests"}</summary><div className="skill-options">{PROFILE_INTEREST_OPTIONS.map((interest) => <label key={interest}><input type="checkbox" checked={profileInterests.includes(interest)} onChange={(event) => setProfileInterests((current) => event.target.checked ? [...current, interest] : current.filter((item) => item !== interest))} />{interest}</label>)}</div></details><label>Other interests <span className="optional">COMMA SEPARATED</span><input value={customProfileInterests} onChange={(event) => setCustomProfileInterests(event.target.value)} placeholder="Add another interest" /></label></div></section>
        </div>
        <section className="profile-section profile-availability"><div className="profile-section-heading"><span>03</span><div><b>Availability & discovery</b><small>Set how much time you can offer</small></div></div><div className="profile-availability-fields"><label>Hours available each week<input type="number" min="0" max="168" value={profileWeeklyHours} onChange={(event) => setProfileWeeklyHours(event.target.value)} /></label><label className="discoverable-check"><input type="checkbox" checked={profileDiscoverable} onChange={(event) => setProfileDiscoverable(event.target.checked)} /><span><b>Show my profile in teammate matching</b><small>Other members can find you based on your skills and interests.</small></span></label></div></section>
      </div>
      {profileError && <div className="auth-error" role="alert">{profileError}</div>}
      <div className="modal-footer profile-modal-footer"><button type="button" className="signout-link" onClick={signOut}>Sign out</button><div><button type="button" className="text-link" onClick={() => setProfileModal(false)}>Cancel</button><button className="button button-dark" type="submit" disabled={profileBusy}>{profileBusy ? "Saving…" : "Save profile"} →</button></div></div>
    </form></div>}
    {logged && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !contributionBusy) setLogged(false); }}><form className="log-modal" onSubmit={publishContribution}><div className="modal-top"><div><span className="match-eyebrow">TEAM TRANSPARENCY</span><h2>Log a contribution</h2><p>Share a clear update so everyone can see how the project is moving.</p></div><button type="button" className="close-modal" onClick={() => !contributionBusy && setLogged(false)}>×</button></div><label>What did you work on?<input name="task" required placeholder="e.g. Interviewed 3 students" /></label><div className="modal-fields"><label>Category<select name="category" defaultValue="Research"><option>Research</option><option>Design</option><option>Development</option><option>Writing</option><option>Planning</option></select></label><label>Time spent<select name="hours" defaultValue="2 hours"><option>30 minutes</option><option>1 hour</option><option>2 hours</option><option>3 hours</option><option>4+ hours</option></select></label></div><div className="task-link-fields"><label>Related task <span className="optional">OPTIONAL</span><select name="task_id" defaultValue=""><option value="">No task linked</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label><label>Evidence URL <span className="optional">OPTIONAL</span><input name="evidence_url" type="url" placeholder="https://…" /></label></div><label>GitHub commit / PR URL <span className="optional">OPTIONAL</span><input name="github_reference" type="url" placeholder="https://github.com/owner/repo/pull/1" /></label><label>Notes <span className="optional">OPTIONAL</span><textarea name="notes" placeholder="Add context, a link, or what you learned…" /></label><div className="modal-footer"><span>Published to the project’s shared contribution log</span><button className="button button-dark" type="submit" disabled={contributionBusy}>{contributionBusy ? "Saving…" : "Publish update →"}</button></div></form></div>}
    {actionModal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setActionModal(""); }}><form className="log-modal" onSubmit={submitAction}>
      <div className="modal-top"><div><span className="match-eyebrow">{actionModal === "invite" ? "GROW YOUR TEAM" : actionModal === "needs" ? "TEAM SKILLS" : "PROJECT WORKSPACE"}</span><h2>{actionModal === "project" ? "Create a project" : actionModal === "settings" ? "Project settings" : actionModal === "needs" ? "Edit project needs" : "Invite teammates"}</h2><p>{actionModal === "invite" ? `Share the six-digit join code for ${projectName}.` : actionModal === "needs" ? "Select the skills your team is looking for." : "Keep project needs, interests, and time expectations clear."}</p></div><button type="button" className="close-modal" onClick={() => setActionModal("")}>×</button></div>
      {inviteLink ? <div className="invite-code-result"><p>Share this invitation link with {inviteEmail}. They can accept or decline after signing in with that email.</p><code>{inviteLink}</code><button type="button" className="button button-dark" onClick={async () => { await navigator.clipboard.writeText(inviteLink); notify("Invitation link copied."); }}>Copy invitation link</button></div> : inviteCode ? <div className="invite-code-result"><p>Share this project code with your teammates. They can enter it at <b>/join</b>.</p><code>{inviteCode}</code><button type="button" className="button button-dark" onClick={async () => { await navigator.clipboard.writeText(inviteCode); notify("Project code copied."); }}>Copy code</button></div> : <>
        {actionModal === "invite" ? <><label>Create an email invitation link <span className="optional">OPTIONAL</span><input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="teammate@example.com" /></label><p className="invite-code-help">Enter an email to create a link they can accept or decline. Leave blank to share the project join code for {projectName}.</p></> : actionModal === "needs" ? <><div className="skill-picker-field"><span className="skill-picker-label">Choose skills needed</span><details className="skill-picker"><summary>{selectedNeedSkills.length ? `${selectedNeedSkills.length} selected` : "Select project skills"}</summary><div className="skill-options">{PROJECT_SKILL_OPTIONS.map((skill) => <label key={skill}><input type="checkbox" checked={selectedNeedSkills.includes(skill)} onChange={(event) => setSelectedNeedSkills((current) => event.target.checked ? [...current, skill] : current.filter((item) => item !== skill))} />{skill}</label>)}</div></details></div><label>Other skills <span className="optional">OPTIONAL · COMMA SEPARATED</span><input type="text" value={customNeedSkills} onChange={(event) => setCustomNeedSkills(event.target.value)} placeholder="Add skills not listed above" /></label></> : <label>Project name<input type="text" required value={actionInput} onChange={(event) => setActionInput(event.target.value)} placeholder="e.g. Campus Connect" /></label>}
        {(actionModal === "settings" || actionModal === "project") && <><label>Project description<textarea value={actionDescription} onChange={(event) => setActionDescription(event.target.value)} placeholder="What is your team working on?" /></label><label>Project interests <span className="optional">COMMA SEPARATED</span><input value={actionInterests} onChange={(event) => setActionInterests(event.target.value)} placeholder="Student wellbeing, campus life" /></label><label>Hours needed from teammates each week<input type="number" min="0" max="168" value={actionHours} onChange={(event) => setActionHours(event.target.value)} /></label>{actionModal === "settings" && <><label>Project due date<input type="date" value={actionDueDate} onChange={(event) => setActionDueDate(event.target.value)} /></label><label>GitHub repository URL <span className="optional">OPTIONAL</span><input type="url" pattern="https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(\.git)?/?" title="Enter a GitHub repository URL, such as https://github.com/owner/repository" value={actionGithubRepoUrl} onChange={(event) => setActionGithubRepoUrl(event.target.value)} placeholder="https://github.com/owner/repository" /></label></>}</>}
        <div className="modal-footer"><span>{actionModal === "invite" ? (inviteEmail.trim() ? "The invited teammate must sign in with this email to respond." : "Anyone with the six-digit code can join this project.") : "Changes are saved to the project database."}</span><button className="button button-dark" type="submit">{actionModal === "invite" ? (inviteEmail.trim() ? "Create invitation link" : "Show project code") : "Save changes"} →</button></div>
      </>}
    </form></div>}
  </main>;
}
