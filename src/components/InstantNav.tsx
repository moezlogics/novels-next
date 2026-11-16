"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * App-like speed without loading screens: the moment a finger touches a link
 * (or the mouse rests on it for a moment), the next page starts loading. By the
 * time the tap finishes, the page is usually ready, so it opens instantly.
 * Skipped on data-saver / 2G so we never waste a slow connection.
 */
export default function InstantNav() {
  const router = useRouter();
  useEffect(() => {
    const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (c?.saveData || /(^|-)2g$/.test(c?.effectiveType || "")) return;
    const done = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const target = (e: Event) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.origin !== location.origin) return null;
      const url = new URL(a.href);
      if (url.pathname === location.pathname && url.search === location.search) return null;
      if (/^\/(api|newlogin|seller|images|uploads)\//.test(url.pathname)) return null;
      return url.pathname + url.search;
    };
    const go = (href: string) => {
      if (done.has(href) || done.size > 60) return;
      done.add(href);
      router.prefetch(href);
    };
    const onTouch = (e: Event) => {
      const h = target(e);
      if (h) go(h);
    };
    const onOver = (e: Event) => {
      const h = target(e);
      clearTimeout(timer);
      if (h) timer = setTimeout(() => go(h), 70);
    };
    document.addEventListener("touchstart", onTouch, { passive: true, capture: true });
    document.addEventListener("mousedown", onTouch, { capture: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouch, { capture: true });
      document.removeEventListener("mousedown", onTouch, { capture: true });
      document.removeEventListener("mouseover", onOver);
      clearTimeout(timer);
    };
  }, [router]);
  return null;
}
