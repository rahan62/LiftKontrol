/**
 * HS256 secret for local JWT cookies. Set in .env.local (server + middleware).
 */
export function getLocalAuthSecret(): Uint8Array {
  const raw = process.env.LOCAL_AUTH_SECRET?.trim();
  if (!raw || raw.length < 32) {
    if (process.env.NODE_ENV === "development") {
      // Dev-only fallback so `next dev` works without extra env; replace for anything shared.
      return new TextEncoder().encode(
        "elevator-local-dev-only-secret-replace-me-32chars-min",
      );
    }
    throw new Error(
      "Set LOCAL_AUTH_SECRET (at least 32 characters) in .env.local for local auth.",
    );
  }
  return new TextEncoder().encode(raw);
}
