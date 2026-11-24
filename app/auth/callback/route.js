import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedPath = requestUrl.searchParams.get("next");
  const nextPath = requestedPath?.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/workspace";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      const googleName = user?.app_metadata?.provider === "google"
        ? (user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || "").trim()
        : "";
      if (user && googleName) {
        try {
          if (!user.user_metadata?.display_name) {
            await supabase.auth.updateUser({ data: { display_name: googleName } });
          }
          const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
          if (profile && !profile.display_name?.trim()) {
            await supabase.from("profiles").update({ display_name: googleName }).eq("id", user.id);
          }
        } catch {
          // OAuth should still complete if an optional profile-name sync fails.
        }
      }
      return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=confirmation", requestUrl.origin));
}
