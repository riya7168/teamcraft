"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient, isSupabaseConfigured } from "../../lib/supabase/client";
import DarkModeToggle from "../../components/DarkModeToggle";

const SKILL_OPTIONS = [
  "Research", "Writing", "Communication", "Project management", "Marketing", "Social media",
  "Graphic design", "UI/UX design", "Figma", "Web development", "React", "JavaScript",
  "Python", "Data analysis", "Video editing", "Photography", "Public speaking", "Event planning", "Fundraising", "Other",
];
const INTEREST_OPTIONS = [
  "Education", "Student communities", "Accessibility", "Mental health", "Climate action",
  "Community service", "Entrepreneurship", "Technology", "Health and wellness", "Arts and culture",
  "Local events", "Sustainability", "Social impact", "Personal finance", "Sports", "Other",
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState(searchParams.get("mode") === "signup" ? "signup" : "login");
  const [name, setName] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [otherSkill, setOtherSkill] = useState("");
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [otherInterest, setOtherInterest] = useState("");
  const [weeklyHours, setWeeklyHours] = useState(5);
  const [discoverable, setDiscoverable] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") === "confirmation" ? "Sign-in could not be completed. Check your Supabase provider settings and try again." : "");
  const [success, setSuccess] = useState(searchParams.get("reason") === "idle-timeout" ? "You were signed out after 30 minutes of inactivity. Sign in again to continue." : "");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!isSupabaseConfigured) return setError("Connect your Supabase project first. Add its URL and publishable key to .env.local, then restart the app.");

    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: name.trim(),
              skills: [...selectedSkills.filter((skill) => skill !== "Other"), ...(selectedSkills.includes("Other") && otherSkill.trim() ? [otherSkill.trim()] : [])],
              interests: [...selectedInterests.filter((interest) => interest !== "Other"), ...(selectedInterests.includes("Other") && otherInterest.trim() ? [otherInterest.trim()] : [])],
              weekly_hours: Number(weeklyHours),
              discoverable,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(searchParams.get("next") || "/workspace")}`,
          },
        });
        if (authError) throw authError;
        if (!data.session) {
          setSuccess("Check your email for a confirmation link. Your workspace will open after you confirm.");
          return;
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      }

      const next = searchParams.get("next");
      router.push(next?.startsWith("/") && !next.startsWith("//") ? next : "/workspace");
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "Something went wrong. Please try again.";
      setError(/failed to fetch|network request failed/i.test(message)
        ? "Can't reach your Supabase project. Check that NEXT_PUBLIC_SUPABASE_URL is the Project URL from Supabase, that the project is active, and that your .env.local changes were followed by a dev-server restart."
        : message);
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setError("");
    setSuccess("");
    if (!isSupabaseConfigured) return setError("Connect your Supabase project first. Add its URL and publishable key to .env.local, then restart the app.");

    setBusy(true);
    try {
      const next = searchParams.get("next") || "/workspace";
      const { error: authError } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (authError) throw authError;
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "Could not start Google sign-in. Please try again.";
      setError(/failed to fetch|network request failed/i.test(message)
        ? "Can't reach your Supabase project. Check your Supabase URL and try again."
        : message);
      setBusy(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setError("");
    setSuccess("");
  };

  return <main className="auth-layout"><aside className="auth-story"><Link href="/" className="brand auth-brand"><span className="brand-mark"><span>t</span></span><span>teamcraft</span></Link><div className="auth-story-content"><span className="section-eyebrow">GOOD TEAMS ARE BUILT</span><h1>Different strengths.<br /><em>One shared goal.</em></h1><p>Find the right people, make space for their schedules, and make every contribution count.</p><div className="auth-quote"><span>“</span><p>When everyone knows what they bring, the whole team moves forward.</p><div className="auth-quote-line"></div><small>THE TEAMCRAFT PRINCIPLE</small></div></div><div className="auth-story-foot">Skills, interests, availability — all in sync.</div></aside><section className="auth-main"><div className="auth-mode-control"><DarkModeToggle /></div><div className="auth-mobile-brand"><Link href="/" className="brand public-brand"><span className="brand-mark"><span>t</span></span><span>teamcraft</span></Link></div><div className="auth-card"><div className="auth-heading"><span className="section-eyebrow">{mode === "login" ? "WELCOME BACK" : "YOUR NEXT PROJECT STARTS HERE"}</span><h2>{mode === "login" ? "Sign in to your team" : "Create your account"}</h2><p>{mode === "login" ? "Pick up where your team left off." : "Set up your account and start building a balanced team."}</p>{mode === "signup" && <div className="signup-steps" aria-label="Account setup steps"><span className="active"><i>01</i> Account</span><b></b><span><i>02</i> Your profile</span><b></b><span><i>03</i> Join a team</span></div>}</div><form onSubmit={submit} className={`auth-form ${mode === "signup" ? "signup-form" : ""}`}>{mode === "signup" && <><label>Your name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Riya Kapoor" required /></label><div className="skill-picker-field"><span className="skill-picker-label">Skills</span><details className="skill-picker"><summary>{selectedSkills.length ? `${selectedSkills.length} selected` : "Choose your skills"}</summary><div className="skill-options">{SKILL_OPTIONS.map((skill) => <label key={skill}><input type="checkbox" checked={selectedSkills.includes(skill)} onChange={(event) => setSelectedSkills((current) => event.target.checked ? [...current, skill] : current.filter((item) => item !== skill))} />{skill}</label>)}</div></details>{selectedSkills.includes("Other") && <input className="other-skill-input" value={otherSkill} onChange={(event) => setOtherSkill(event.target.value)} placeholder="Enter another skill" />}</div><div className="skill-picker-field"><span className="skill-picker-label">Interests</span><details className="skill-picker"><summary>{selectedInterests.length ? `${selectedInterests.length} selected` : "Choose your interests"}</summary><div className="skill-options">{INTEREST_OPTIONS.map((interest) => <label key={interest}><input type="checkbox" checked={selectedInterests.includes(interest)} onChange={(event) => setSelectedInterests((current) => event.target.checked ? [...current, interest] : current.filter((item) => item !== interest))} />{interest}</label>)}</div></details>{selectedInterests.includes("Other") && <input className="other-skill-input" value={otherInterest} onChange={(event) => setOtherInterest(event.target.value)} placeholder="Enter another interest" />}</div><label>Hours available each week<input type="number" min="0" max="168" value={weeklyHours} onChange={(event) => setWeeklyHours(event.target.value)} /></label><label className="discoverable-check"><input type="checkbox" checked={discoverable} onChange={(event) => setDiscoverable(event.target.checked)} /> Show my profile in teammate matching</label></>}<label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@university.edu" required /></label><div className="auth-password-field"><label htmlFor="teamcraft-password">Password</label><div className="password-wrap"><input id="teamcraft-password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" minLength={6} required /><button className="password-visibility-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Hide" : "Show"}</button></div></div>{error && <div className="auth-error" role="alert">{error}</div>}{success && <div className="auth-success" role="status">{success}</div>}<button className="button button-dark auth-submit" type="submit">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}<span>→</span></button><div className="auth-divider"><span>or continue with</span></div><button className="google-auth-button" type="button" onClick={signInWithGoogle} disabled={busy}><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6.1 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z"/></svg>{busy ? "Connecting to Google…" : "Continue with Google"}</button></form><div className="auth-switch">{mode === "login" ? "New to Teamcraft?" : "Already have an account?"} <button onClick={toggleMode}>{mode === "login" ? "Create an account" : "Sign in"}</button></div><div className="demo-note"><span>✳</span><p><b>{isSupabaseConfigured ? "Secure Supabase sign-in" : "Backend setup needed"}</b><br />{isSupabaseConfigured ? "Your account and team data are protected by Supabase Auth and project permissions." : "Add your Supabase project URL and publishable key to .env.local to enable accounts."}</p></div></div><div className="auth-footer"><Link href="/">← Back to homepage</Link><span>© 2026 Teamcraft</span></div></section></main>;
}

export default function LoginPage() {
  return <Suspense fallback={<main className="route-loading">Loading sign in…</main>}><LoginForm /></Suspense>;
}
