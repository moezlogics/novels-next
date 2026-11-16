import { col } from "@/lib/db";
import { getMemberId } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Counts post views from the feed (a post counts once per visitor per session; the
 * browser batches them). The author's own views are not counted.
 */
export async function POST(req: Request) {
  if (/bot|crawl|spider|preview|lighthouse/i.test(req.headers.get("user-agent") || "")) return new Response(null, { status: 204 });
  const b = await req.json().catch(() => ({}));
  const ids = (Array.isArray(b.ids) ? b.ids : [])
    .map((x: unknown) => parseInt(String(x), 10))
    .filter((x: number) => x > 0)
    .slice(0, 40);
  if (!ids.length) return new Response(null, { status: 204 });
  const viewer = await getMemberId();
  await (await col.communityPosts()).updateMany({ _id: { $in: ids }, ...(viewer ? { member_id: { $ne: viewer } } : {}) }, { $inc: { views: 1 } });
  return new Response(null, { status: 204 });
}
