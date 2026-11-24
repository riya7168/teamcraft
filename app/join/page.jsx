"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "../../lib/supabase/client";
import DarkModeToggle from "../../components/DarkModeToggle";

export default function JoinProjectPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCode(new URLSearchParams(window.location.search).get("code") || "");
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const inviteCode = code.replace(/\D/g, "").slice(0, 6);
    if (inviteCode.length !== 6) {
      setMessage("Enter the six-digit project code.");
      return;
    }
    if (!isSupabaseConfigured) {
      setMessage("Teamcraft is not connected to Supabase yet.");
      return;
    }

    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/join?code=${inviteCode}`)}`);
      return;
    }

    const { data: projectId, error } = await supabase.rpc("join_project_with_code", { code: inviteCode });
    if (error || !projectId) {
      setMessage(error?.message || "That code is invalid, or this account has reached its attempt limit. Try again later.");
      setBusy(false);
      return;
    }
    router.push(`/workspace?project=${projectId}`);
  };

  return <main className="invite-page">
    <Link href="/" className="brand public-brand"><span className="brand-mark"><span>t</span></span><span>teamcraft</span></Link>
    <div className="invite-theme-control"><DarkModeToggle /></div><form className="invite-card" onSubmit={submit}>
      <div className="feature-icon">✳</div>
      <span className="section-eyebrow">TEAMCRAFT INVITATION</span>
      <h1>Join a project</h1>
      <p>Enter the six-digit code shared by a project teammate.</p>
      <label htmlFor="invite-code">Project code</label>
      <input id="invite-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="one-time-code" required placeholder="000000" />
      {message && <div className="auth-error" role="alert">{message}</div>}
      <button className="button button-dark" type="submit" disabled={busy}>{busy ? "Joining…" : "Join project →"}</button>
      <Link href="/workspace" className="invite-back">Back to your workspace</Link>
    </form>
  </main>;
}
