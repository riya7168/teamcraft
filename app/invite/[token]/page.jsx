"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "../../../lib/supabase/client";
import DarkModeToggle from "../../../components/DarkModeToggle";

export default function AcceptInvitationPage() {
  const { token } = useParams();
  const router = useRouter();
  const [invite, setInvite] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [responded, setResponded] = useState("");

  useEffect(() => {
    let alive = true;
    const loadInvite = async () => {
      if (!isSupabaseConfigured) {
        setMessage("Connect the app to Supabase before accepting invitations.");
        return;
      }
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
        return;
      }
      const { data, error } = await supabase.from("project_invitations").select("email, accepted_at, declined_at, projects(name, description)").eq("token", token).maybeSingle();
      if (!alive) return;
      if (error || !data || data.accepted_at || data.declined_at) setMessage("This invitation is unavailable or has already been answered.");
      else setInvite({ ...data, currentEmail: user.email });
    };
    loadInvite();
    return () => { alive = false; };
  }, [router, token]);

  const acceptInvite = async () => {
    setBusy(true);
    setMessage("");
    const { error } = await createClient().rpc("accept_project_invitation", { invite_token: token });
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    router.push("/workspace");
  };

  const declineInvite = async () => {
    setBusy(true);
    setMessage("");
    const { error } = await createClient().rpc("decline_project_invitation", { invite_token: token });
    if (error) setMessage(error.message || "Could not decline this invitation.");
    else setResponded("You declined this invitation. The project lead has been notified.");
    setBusy(false);
  };

  return <main className="invite-page"><Link href="/" className="brand public-brand"><span className="brand-mark"><span>t</span></span><span>teamcraft</span></Link><div className="invite-theme-control"><DarkModeToggle /></div><section className="invite-card"><div className="feature-icon">✳</div><span className="section-eyebrow">TEAMCRAFT INVITATION</span><h1>Join a project team</h1>{invite ? <><p>You’ve been invited to <b>{invite.projects?.name || "a Teamcraft project"}</b> as a project member.</p><div className="invite-email">Signed in as <b>{invite.currentEmail}</b><br />Invitation sent to <b>{invite.email}</b></div>{invite.currentEmail?.toLowerCase() !== invite.email.toLowerCase() ? <p className="auth-error">Sign in using {invite.email} to respond to this invitation.</p> : responded ? <div className="auth-success" role="status">{responded}</div> : <div className="invite-response-actions"><button className="button button-dark" onClick={acceptInvite} disabled={busy}>{busy ? "Please wait…" : "Accept invitation →"}</button><button className="button button-light" onClick={declineInvite} disabled={busy}>Decline</button></div>}</> : <p>{message || "Checking your invitation…"}</p>}{message && invite && <div className="auth-error" role="alert">{message}</div>}<Link href="/workspace" className="invite-back">Return to your workspace</Link></section></main>;
}
