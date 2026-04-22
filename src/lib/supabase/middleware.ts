import { jwtVerify } from "jose";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getLocalAuthSecret } from "@/lib/auth/local-secret";

/** Inline string — Edge middleware must not rely on re-exports (bundler can drop or mis-resolve imports). */
const LOCAL_SESSION = "local_session";

const EXPO_SHELL_COOKIE = "expo_shell_cmd";

export async function updateSession(request: NextRequest) {
  const expoCmd = request.nextUrl.searchParams.get("__expo_cmd");
  if (
    (expoCmd === "menu" || expoCmd === "signout") &&
    request.nextUrl.pathname.startsWith("/app")
  ) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("__expo_cmd");
    clean.searchParams.delete("_t");
    const res = NextResponse.redirect(clean);
    res.cookies.set(EXPO_SHELL_COOKIE, expoCmd, {
      path: "/",
      maxAge: 30,
      sameSite: "lax",
      httpOnly: false,
      secure: request.nextUrl.protocol === "https:",
    });
    return res;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let user: { id: string } | null = null;

  if (url?.trim() && key?.trim()) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    user = u ? { id: u.id } : null;
  } else {
    const token = request.cookies.get(LOCAL_SESSION)?.value;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, getLocalAuthSecret());
        if (payload.sub) {
          user = { id: payload.sub };
        }
      } catch {
        user = null;
      }
    }
  }

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname.startsWith("/auth");

  if (!user && !isAuthRoute && request.nextUrl.pathname.startsWith("/app")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/app";
    return NextResponse.redirect(redirectUrl);
  }

  supabaseResponse.headers.set("x-pathname", request.nextUrl.pathname);
  return supabaseResponse;
}
