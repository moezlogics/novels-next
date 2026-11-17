import { cookies } from "next/headers";
import { col, nextId } from "@/lib/db";
import { getMember, getMemberId } from "@/lib/auth";
import { hydratePosts, rankPosts } from "@/lib/community";
import { moderate } from "@/lib/moderation";
import { deleteStoredFile, saveImage } from "@/lib/storage";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Feed: ?sort=for_you|latest&category_id=&page=&limit=  or  ?username= (profile) or ?id= (single) */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const viewer = await getMemberId();
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const limit = Math.min(20, Math.max(1, parseInt(sp.get("limit") || "10", 10) || 10));
  const cat = parseInt(sp.get("category_id") || "0", 10) || 0;
  const posts = await col.communityPosts();

  const id = parseInt(sp.get("id") || "", 10);
  if (id) {
    const p = await posts.findOne({ _id: id });
    return Response.json({ status: "success", posts: p ? await hydratePosts([p], viewer) : [], has_more: false });
  }
  const username = sp.get("username");
  if (username) {
    const m = await (await col.members()).findOne({ username }, { projection: { _id: 1 } });
    if (!m) return Response.json({ status: "success", posts: [], has_more: false });
    const rows = await posts.find({ member_id: m._id }).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit + 1).toArray();
    return Response.json({ status: "success", posts: await hydratePosts(rows.slice(0, limit), viewer), has_more: rows.length > limit });
  }

  const q = cat ? { category_id: cat } : {};
  if (sp.get("sort") === "latest") {
    const rows = await posts.find(q).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit + 1).toArray();
    return Response.json({ status: "success", posts: await hydratePosts(rows.slice(0, limit), viewer), has_more: rows.length > limit });
  }

  // For You
  let aff: Record<number, number> = {};
  if (viewer) {
    (await (await col.memberInterests()).find({ member_id: viewer }).toArray()).forEach((r) => (aff[r.category_id] = r.weight));
  } else {
    try {
      aff = JSON.parse(decodeURIComponent((await cookies()).get("guest_category_affinity")?.value || "{}")) || {};
    } catch {}
  }
  const seed = parseInt(sp.get("seed") || "0", 10) || 7;
  const all = await hydratePosts(await posts.find(q).sort({ created_at: -1 }).limit(300).toArray(), viewer);
  const ranked = rankPosts(all, aff, viewer, seed);
  return Response.json({ status: "success", posts: ranked.slice((page - 1) * limit, page * limit), has_more: page * limit < ranked.length });
}

export async function POST(req: Request) {
  const s = await getSettings();
  if (s.community_coming_soon) return Response.json({ error: "Community is coming soon." }, { status: 403 });
  const m = await getMember();
  if (!m) return Response.json({ error: "Please sign in to post." }, { status: 401 });
  const f = await req.formData();
  const content = String(f.get("content") || "").trim().slice(0, 5000);
  const catId = parseInt(String(f.get("category_id") || ""), 10) || null;
  if (!content) return Response.json({ error: "Post content cannot be empty" }, { status: 400 });

  const recent = await (await col.communityPosts()).countDocuments({ member_id: m._id, created_at: { $gt: new Date(Date.now() - 10 * 60000) } });
  if (recent >= 5) return Response.json({ error: "You are posting too fast. Please wait a few minutes." }, { status: 429 });

  const files = f.getAll("images").filter((x): x is File => x instanceof File && x.size > 0).slice(0, 4);
  const buffers = await Promise.all(files.map(async (file) => ({ mime: file.type || "image/jpeg", data: Buffer.from(await file.arrayBuffer()) })));
  const mod = await moderate("community_post", content, buffers);
  if (!mod.ok) return Response.json({ error: mod.reason }, { status: 400 });

  const paths: string[] = [];
  try {
    for (const file of files) paths.push((await saveImage(file, { dir: "uploads/community", prefix: "post", maxWidth: 1400 })).path);
  } catch (e) {
    for (const p of paths) await deleteStoredFile(p);
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  const id = await nextId("community_posts");
  await (await col.communityPosts()).insertOne({ _id: id, member_id: m._id, category_id: catId, content, images: paths, created_at: new Date() });
  if (catId) await (await col.memberInterests()).updateOne({ member_id: m._id, category_id: catId }, { $inc: { weight: 1 }, $set: { updated_at: new Date() } }, { upsert: true });
  return Response.json({ status: "success", post: { id, content, images: paths } });
}

export async function DELETE(req: Request) {
  const m = await getMember();
  if (!m) return Response.json({ error: "Please sign in." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const id = parseInt(b.post_id, 10);
  const posts = await col.communityPosts();
  const p = await posts.findOne({ _id: id });
  if (!p || p.member_id !== m._id) return Response.json({ error: "You can only delete your own posts." }, { status: 403 });
  if (p.story) return Response.json({ error: "This is a story episode. Delete it from the story page." }, { status: 400 });
  await posts.deleteOne({ _id: id });
  await (await col.communityLikes()).deleteMany({ post_id: id });
  await (await col.communityComments()).deleteMany({ post_id: id });
  for (const img of p.images || []) await deleteStoredFile(img);
  return Response.json({ status: "success" });
}
