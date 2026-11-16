import "server-only";
import { unstable_cache } from "next/cache";
import { col } from "./db";

/** Normalise a path the way the site uses it: leading and trailing slash, lower-case, no query. */
export function normPath(p: string): string {
  let s = String(p || "").trim();
  try {
    if (/^https?:\/\//i.test(s)) s = new URL(s).pathname;
  } catch {}
  s = s.split(/[?#]/)[0];
  s = decodeURIComponent(s).toLowerCase();
  if (!s.startsWith("/")) s = "/" + s;
  if (!s.endsWith("/")) s += "/";
  return s.replace(/\/{2,}/g, "/");
}

/** All redirects in one small cached map (busted when the admin edits them). */
const redirectMap = unstable_cache(
  async () => {
    const rows = await (await col.redirects()).find({}, { projection: { from: 1, to: 1, code: 1 } }).toArray();
    return rows.map((r) => [r.from, r.to, r.code] as [string, string, number]);
  },
  ["redirects-v1"],
  { tags: ["content", "redirects"], revalidate: 3600 },
);

/** Only called for links that would otherwise 404, so normal pages never pay for it. */
export async function findRedirect(path: string): Promise<{ to: string; code: number } | null> {
  const want = normPath(path);
  const hit = (await redirectMap()).find(([from]) => from === want);
  if (!hit) return null;
  void col.redirects().then((c) => c.updateOne({ from: want }, { $inc: { hits: 1 } })).catch(() => {});
  return { to: hit[1], code: hit[2] };
}

/**
 * A page's URL changed in admin: send the old address to the new one (301) so Google
 * and old links never hit a 404. Also collapses chains (A→B→C becomes A→C).
 */
export async function slugMoved(oldSlug: string | undefined | null, newTo: string) {
  if (!oldSlug) return;
  const from = normPath(`/${oldSlug}/`);
  const to = /^https?:\/\//i.test(newTo) ? newTo : normPath(newTo);
  if (from === to) return;
  const { revalidateTag } = await import("next/cache");
  const { nextId } = await import("./db");
  const c = await col.redirects();
  await c.deleteOne({ from: to }); // the new address is a real page now
  await c.updateMany({ to: from }, { $set: { to } }); // no chains
  const hit = await c.findOne({ from });
  if (hit) await c.updateOne({ _id: hit._id }, { $set: { to, code: 301 } });
  else await c.insertOne({ _id: await nextId("redirects"), from, to, code: 301, hits: 0, created_at: new Date() });
  revalidateTag("redirects", { expire: 0 });
}
