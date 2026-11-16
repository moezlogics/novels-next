import { col } from "@/lib/db";
import { getMemberId } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Lightweight counters: views / reads / downloads + member category interest. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const id = parseInt(b.id, 10);
  const ev = ["view", "read", "download"].includes(b.ev) ? (b.ev as string) : "";
  if (!id || !ev) return Response.json({ ok: false }, { status: 400 });
  const field = ev === "view" ? "views" : ev === "read" ? "reads" : "downloads";
  const posts = await col.posts();
  const p = await posts.findOneAndUpdate({ _id: id }, { $inc: { [field]: 1 } }, { projection: { category_id: 1 } });
  if (ev === "view" && p?.category_id) {
    const mid = await getMemberId();
    if (mid) {
      await (await col.memberInterests()).updateOne({ member_id: mid, category_id: p.category_id }, { $inc: { weight: 1 }, $set: { updated_at: new Date() } }, { upsert: true });
    }
  }
  return Response.json({ ok: true });
}
