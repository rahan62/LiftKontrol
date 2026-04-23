import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type PlatformAdminContext = {
  userId: string;
  email: string;
};

export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    redirect("/login");
  }

  const { data: op } = await supabase
    .from("platform_operators")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!op) {
    redirect("/login?error=forbidden");
  }

  return { userId: user.id, email: user.email ?? "" };
}
