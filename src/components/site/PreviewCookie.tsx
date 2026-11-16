"use client";
import { useEffect } from "react";

/** Remember a valid ?preview= key for 90 days (coming-soon bypass). */
export default function PreviewCookie({ feature, token }: { feature: string; token: string }) {
  useEffect(() => {
    document.cookie = `kn_preview_${feature}=${encodeURIComponent(token)};path=/;max-age=${90 * 86400};SameSite=Lax`;
  }, [feature, token]);
  return null;
}
