import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function updateSession(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers || {}).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  // getClaims() can return a null data object when there is no usable session
  // (for example, on a fresh visit or if the auth request fails). Public routes
  // should still render in that case; only protected routes need a redirect.
  let claims = null;
  try {
    const { data } = await supabase.auth.getClaims();
    claims = data?.claims ?? null;
  } catch {
    // Treat an unavailable auth check as signed out instead of breaking every
    // page request. Supabase will refresh the session on later requests.
  }
  const pathname = request.nextUrl.pathname;
  if (!claims && pathname.startsWith("/workspace")) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/login";
    destination.searchParams.set("next", pathname);
    return NextResponse.redirect(destination);
  }

  if (claims && pathname === "/login") {
    const destination = request.nextUrl.clone();
    destination.pathname = "/workspace";
    destination.search = "";
    return NextResponse.redirect(destination);
  }

  return response;
}
