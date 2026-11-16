import { col, nextId } from "@/lib/db";
import { getMember } from "@/lib/auth";
import { moderate } from "@/lib/moderation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET comments of a post */
export async function GET(_req: Request, ctx: Ctx) {
  const id = parseInt((await ctx.params).id, 10);
  const rows = await (await col.communityComments()).find({ post_id: id }).sort({ created_at: 1 }).limit(300).toArray();
  const members = await (await col.members()).find({ _id: { $in: [...new Set(rows.map((r) => r.member_id))] } }, { projection: { name: 1, username: 1, profile_pic: 1 } }).toArray();
  const mm = new Map(members.map((m) => [m._id, m]));
  return Response.json({
    status: "success",
    comments: rows.map((r) => {
      const m = mm.get(r.member_id);
      return { id: r._id, comment: r.comment, created_at: r.created_at, author_name: m?.name || "Reader", author_username: m?.username || "", author_avatar: m?.profile_pic && !/default_avatar/i.test(m.profile_pic) ? m.profile_pic : "" };
    }),
  });
}

/** POST {action:"like"} toggles like; {action:"comment", comment} adds a comment */
export async function POST(req: Request, ctx: Ctx) {
  const id = parseInt((await ctx.params).id, 10);
  const m = await getMember();
  if (!m) return Response.json({ error: "Please sign in." }, { status: 401 });
  const post = await (await col.communityPosts()).findOne({ _id: id });
  if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));

  if (b.action === "like") {
    const likes = await col.communityLikes();
    const del = await likes.deleteOne({ member_id: m._id, post_id: id });
    let liked = false;
    if (!del.deletedCount) {
      await likes.insertOne({ member_id: m._id, post_id: id, created_at: new Date() });
      liked = true;
      if (post.category_id) await (await col.memberInterests()).updateOne({ member_id: m._id, category_id: post.category_id }, { $inc: { weight: 1 }, $set: { updated_at: new Date() } }, { upsert: true });
    }
    return Response.json({ status: "success", user_liked: liked, likes_count: await likes.countDocuments({ post_id: id }) });
  }

  if (b.action === "comment") {
    const text = String(b.comment || "").trim().slice(0, 1000);
    if (!text) return Response.json({ error: "Comment cannot be empty" }, { status: 400 });
    const mod = await moderate("comment", text);
    if (!mod.ok) return Response.json({ error: mod.reason }, { status: 400 });
    const comments = await col.communityComments();
    await comments.insertOne({ _id: await nextId("community_comments"), post_id: id, member_id: m._id, comment: text, created_at: new Date() });
    return Response.json({ status: "success", comments_count: await comments.countDocuments({ post_id: id }) });
  }
  return Response.json({ error: "Invalid action" }, { status: 400 });
}
