import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    return response;
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLogin = pathname.startsWith("/login");

  if (isLogin) {
    if (user) {
      const { data: op } = await supabase
        .from("platform_operators")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (op) {
        return NextResponse.redirect(new URL("/tenants", request.url));
      }
      await supabase.auth.signOut();
    }
    return response;
  }

  if (!user) {
    const next = NextResponse.redirect(new URL("/login", request.url));
    next.headers.set("x-url", request.url);
    return next;
  }

  const { data: op } = await supabase
    .from("platform_operators")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!op) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=forbidden", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
