import { col } from "@/lib/db";
import { getMemberId } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Reading progress sync across devices for signed-in members (new feature). */
export async function GET(req: Request) {
  const mid = await getMemberId();
  if (!mid) return Response.json({ progress: null });
  const sp = new URL(req.url).searchParams;
  const pid = parseInt(sp.get("post_id") || "", 10);
  const c = await col.progress();
  if (pid) {
    const p = await c.findOne({ member_id: mid, post_id: pid }, { projection: { _id: 0 } });
    return Response.json({ progress: p }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const list = await c.find({ member_id: mid }, { projection: { _id: 0 } }).sort({ updated_at: -1 }).limit(60).toArray();
  return Response.json({ list }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: Request) {
  const mid = await getMemberId();
  if (!mid) return Response.json({ ok: false }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const pid = parseInt(b.post_id, 10);
  const page = parseInt(b.page, 10);
  if (!pid || !page) return Response.json({ ok: false }, { status: 400 });
  const bm = parseInt(b.bookmark, 10) || null;
  await (await col.progress()).updateOne(
    { member_id: mid, post_id: pid },
    { $set: { page, total: parseInt(b.total, 10) || 0, scroll: parseInt(b.scroll, 10) || 0, zoom: Number(b.zoom) || 1, bookmark: bm, updated_at: new Date() } },
    { upsert: true },
  );
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const mid = await getMemberId();
  if (!mid) return Response.json({ ok: false }, { status: 401 });
  const pid = parseInt(new URL(req.url).searchParams.get("post_id") || "", 10);
  if (pid) await (await col.progress()).updateOne({ member_id: mid, post_id: pid }, { $set: { bookmark: null } });
  return Response.json({ ok: true });
}
