"use client";

import { isSupabaseConfigured } from "@/lib/auth/config";
import { createClient } from "@/lib/supabase/client";

/** Shared by SignOutButton and Expo shell triggers. */
export async function signOutClient(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
  } else {
    await fetch("/api/auth/local/logout", { method: "POST", credentials: "include" });
  }
}
