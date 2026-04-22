import { getPool } from "@/lib/db/pool";

export async function verifyLocalCredentials(
  email: string,
  password: string,
): Promise<{ id: string; email: string } | null> {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; email: string }>(
    `SELECT id, email FROM auth.users
     WHERE lower(email) = $1 AND crypt($2, encrypted_password) = encrypted_password`,
    [email.trim().toLowerCase(), password],
  );
  return rows[0] ?? null;
}
