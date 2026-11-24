"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "../lib/supabase/client";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"];

export default function SessionTimeout() {
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = createClient();
    let timer;
    let signedIn = false;
    let signingOut = false;

    const clearTimer = () => window.clearTimeout(timer);
    const resetTimer = () => {
      clearTimer();
      if (!signedIn || signingOut) return;
      timer = window.setTimeout(async () => {
        signingOut = true;
        await supabase.auth.signOut();
        router.replace("/login?reason=idle-timeout");
      }, IDLE_TIMEOUT_MS);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      signedIn = Boolean(session);
      if (!signedIn || event === "SIGNED_OUT") clearTimer();
      else resetTimer();
    });

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    window.addEventListener("focus", resetTimer);
    supabase.auth.getSession().then(({ data: { session } }) => {
      signedIn = Boolean(session);
      resetTimer();
    });

    return () => {
      clearTimer();
      subscription.unsubscribe();
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
      window.removeEventListener("focus", resetTimer);
    };
  }, [router]);

  return null;
}
