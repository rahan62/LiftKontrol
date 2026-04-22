import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { getLocalAuthSecret } from "@/lib/auth/local-secret";
import { LOCAL_SESSION_COOKIE } from "@/lib/auth/constants";
import { verifyLocalCredentials } from "@/lib/auth/verify-local-credentials";

export async function POST(request: Request) {
  let body: { email?: string; password?: string; remember?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = "email" in body ? body.email?.trim().toLowerCase() : "";
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const user = await verifyLocalCredentials(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  const remember = Boolean(body.remember);
  const maxAgeSeconds = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
  const token = await new SignJWT({ sub: user.id, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(remember ? "30d" : "1d")
    .sign(getLocalAuthSecret());

  const res = NextResponse.json({ ok: true });
  res.cookies.set(LOCAL_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSeconds,
  });
  return res;
}
