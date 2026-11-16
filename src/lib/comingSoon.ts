import "server-only";
import { cookies } from "next/headers";
import { getAdmin } from "./auth";
import { getSettings } from "./settings";

/** Shop / Community "coming soon" gate with admin bypass + secret preview link (same as PHP). */
export async function featureOpen(feature: "shop" | "community", previewParam?: string): Promise<boolean> {
  const s = await getSettings();
  const enabled = feature === "shop" ? s.shop_coming_soon : s.community_coming_soon;
  if (!enabled) return true;
  if (await getAdmin()) return true;
  const key = feature === "shop" ? s.shop_preview_key : s.community_preview_key;
  if (!key) return false;
  const cookie = (await cookies()).get(`kn_preview_${feature}`)?.value;
  return previewParam === key || cookie === key;
}
