"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "../lib/supabase/client";

export default function JoinWithCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const projectCode = code.replace(/\D/g, "").slice(0, 6);
    if (projectCode.length !== 6) {
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
      router.push(`/login?next=${encodeURIComponent(`/join?code=${projectCode}`)}`);
      return;
    }

    const { data: projectId, error } = await supabase.rpc("join_project_with_code", { code: projectCode });
    if (error || !projectId) {
      setMessage(error?.message || "That code is invalid, or this account has reached its attempt limit.");
      setBusy(false);
      return;
    }
    router.push(`/workspace?project=${projectId}`);
  };

  return <div className="home-join-box">
    <div><b>Already have a team code?</b><span>Enter it to join a project.</span></div>
    <form onSubmit={submit}>
      <input aria-label="Six-digit project code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" />
      <button type="submit" disabled={busy}>{busy ? "Joining…" : "Join team →"}</button>
    </form>
    {message && <p role="alert">{message}</p>}
  </div>;
}
