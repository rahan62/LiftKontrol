"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { createClient } from "@/lib/supabase/server";

function q(msg: string) {
  return encodeURIComponent(msg);
}

export async function updateMarketingPricingAction(formData: FormData) {
  await requirePlatformAdmin();
  const supabase = await createClient();

  const featuresRaw = String(formData.get("features") || "");
  const features = featuresRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const value = {
    eyebrow: String(formData.get("eyebrow") || "").trim(),
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    campaignBadge: String(formData.get("campaignBadge") || "").trim(),
    packageTitle: String(formData.get("packageTitle") || "").trim(),
    packageSubtitle: String(formData.get("packageSubtitle") || "").trim(),
    priceMain: String(formData.get("priceMain") || "").trim(),
    priceUnit: String(formData.get("priceUnit") || "").trim(),
    priceNote: String(formData.get("priceNote") || "").trim(),
    footerNote: String(formData.get("footerNote") || "").trim(),
    features,
  };

  const { error } = await supabase.from("platform_settings").upsert(
    {
      key: "marketing_pricing",
      value,
    },
    { onConflict: "key" },
  );
  if (error) {
    redirect(`/settings/marketing?error=${q(error.message)}`);
  }
  revalidatePath("/settings/marketing");
  redirect("/settings/marketing?ok=1");
}
