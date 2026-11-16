import "server-only";

/**
 * Google Drive helpers (server). Nothing is downloaded or stored here:
 * the reader uses Google's own viewer, downloads go straight to Google.
 * Only a 1-byte probe is used to check that a file is public + get its size.
 */

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
type G = typeof globalThis & { _knResolve?: Map<string, { url: string; at: number }>; _knSizes?: Map<string, number> };
const g = globalThis as G;
const resolved = (g._knResolve ??= new Map());
const sizes = (g._knSizes ??= new Map());

export function cleanDriveId(id: string): string {
  return String(id || "").replace(/[^a-zA-Z0-9_-]/g, "");
}

function directUrl(id: string) {
  return `https://drive.usercontent.google.com/download?id=${id}&export=download&authuser=0&confirm=t`;
}

/** Follow Drive redirects once and remember the final URL (and size) for 3 hours. */
export async function resolveDrive(id: string, force = false): Promise<string> {
  const hit = resolved.get(id);
  if (!force && hit && Date.now() - hit.at < 3 * 3600 * 1000) return hit.url;
  let url = directUrl(id);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Range: "bytes=0-0" }, redirect: "follow", signal: AbortSignal.timeout(15000) });
    const type = r.headers.get("content-type") || "";
    if (r.ok && !type.includes("text/html")) {
      url = r.url || url;
      const total = parseInt(r.headers.get("content-range")?.split("/")[1] || "", 10);
      if (total > 0) sizes.set(id, total);
    } else if (type.includes("text/html")) {
      // large-file "can't scan for viruses" page → confirm/uuid from the form
      const html = await r.text();
      const uuid = html.match(/name="uuid" value="([^"]+)"/)?.[1];
      const confirm = html.match(/name="confirm" value="([^"]+)"/)?.[1] || "t";
      if (uuid) url = `${directUrl(id).replace("confirm=t", `confirm=${confirm}`)}&uuid=${uuid}`;
    }
    r.body?.cancel().catch(() => {});
  } catch {}
  resolved.set(id, { url, at: Date.now() });
  return url;
}

/** Size in bytes, or 0 when the file is private / deleted / unreachable. */
export async function pdfSize(raw: string): Promise<number> {
  const id = cleanDriveId(raw);
  const known = sizes.get(id);
  if (known) return known;
  for (let attempt = 0; attempt < 2; attempt++) {
    const url = await resolveDrive(id, attempt > 0);
    const after = sizes.get(id);
    if (after) return after;
    const r = await fetch(url, { headers: { "User-Agent": UA, Range: "bytes=0-0" }, redirect: "follow", signal: AbortSignal.timeout(15000) }).catch(() => null);
    const total = parseInt(r?.headers.get("content-range")?.split("/")[1] || "", 10);
    r?.body?.cancel().catch(() => {});
    if (total > 0) {
      sizes.set(id, total);
      return total;
    }
  }
  return 0;
}
