import { col, nextId } from "@/lib/db";
import { getMember } from "@/lib/auth";
import { moderate } from "@/lib/moderation";
import { deleteStoredFile, saveImage } from "@/lib/storage";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const MAX_EPISODE = 100000; // characters
const bad = (error: string, status = 400) => Response.json({ error }, { status });

/** Writers' stories: one endpoint, `action` = save_story | delete_story | save_episode | delete_episode. */
export async function POST(req: Request) {
  if ((await getSettings()).community_coming_soon) return bad("Community is coming soon.", 403);
  const m = await getMember();
  if (!m) return bad("Please sign in.", 401);
  const f = await req.formData();
  const str = (k: string, max: number) => String(f.get(k) || "").trim().slice(0, max);
  const int = (k: string) => parseInt(String(f.get(k) || ""), 10) || 0;
  const action = str("action", 30);
  const stories = await col.stories();
  const episodes = await col.storyEpisodes();
  const posts = await col.communityPosts();
  const now = new Date();

  const dropPost = async (postId: number) => {
    await posts.deleteOne({ _id: postId });
    await (await col.communityLikes()).deleteMany({ post_id: postId });
    await (await col.communityComments()).deleteMany({ post_id: postId });
  };

  if (action === "save_story") {
    const id = int("id");
    const title = str("title", 120);
    const description = str("description", 1500);
    if (title.length < 2) return bad("Please write the story name.");
    const status = str("status", 10) === "complete" ? "complete" : "ongoing";
    const category_id = int("category_id") || null;
    const old = id ? await stories.findOne({ _id: id }) : null;
    if (id && (!old || old.member_id !== m._id)) return bad("You can only edit your own story.", 403);
    if (!old && (await stories.countDocuments({ member_id: m._id, created_at: { $gt: new Date(Date.now() - 3600000) } })) >= 3) return bad("Too many new stories. Please try again later.", 429);
    const file = f.get("cover");
    const hasFile = file instanceof File && file.size > 0;
    const mod = await moderate("community_post", `${title}\n${description}`, hasFile ? [{ mime: file.type || "image/jpeg", data: Buffer.from(await file.arrayBuffer()) }] : []);
    if (!mod.ok) return bad(mod.reason);
    let cover = old?.cover || "";
    if (hasFile) {
      try {
        const saved = (await saveImage(file, { dir: "uploads/community", prefix: "story", maxWidth: 600 })).path;
        if (cover) await deleteStoredFile(cover);
        cover = saved;
      } catch (e) {
        return bad((e as Error).message);
      }
    }
    if (old) {
      await stories.updateOne({ _id: id }, { $set: { title, description, status, category_id, cover } });
      await posts.updateMany({ "story.id": id }, { $set: { "story.title": title } });
      return Response.json({ status: "success", id });
    }
    const newId = await nextId("community_stories");
    await stories.insertOne({ _id: newId, member_id: m._id, title, description, cover, category_id, status, episodes: 0, views: 0, created_at: now, updated_at: now });
    return Response.json({ status: "success", id: newId });
  }

  const story = await stories.findOne({ _id: int("story_id") || int("id") });
  if (!story || story.member_id !== m._id) return bad("Story not found.", 404);

  if (action === "delete_story") {
    for (const e of await episodes.find({ story_id: story._id }, { projection: { post_id: 1 } }).toArray()) await dropPost(e.post_id);
    await episodes.deleteMany({ story_id: story._id });
    await stories.deleteOne({ _id: story._id });
    if (story.cover) await deleteStoredFile(story.cover);
    return Response.json({ status: "success" });
  }

  if (action === "save_episode") {
    const n = int("n");
    const title = str("title", 120);
    const content = String(f.get("content") || "").replace(/\r\n/g, "\n").trim().slice(0, MAX_EPISODE);
    if (content.length < 200) return bad("An episode needs at least 200 characters.");
    // moderation reads the start, middle and end of long episodes
    const mid = Math.floor(content.length / 2);
    const sample = content.length > 4500 ? `${content.slice(0, 1500)}\n…\n${content.slice(mid, mid + 1500)}\n…\n${content.slice(-1500)}` : content;
    const mod = await moderate("community_post", `${title}\n${sample}`);
    if (!mod.ok) return bad(mod.reason);
    if (n) {
      const ep = await episodes.findOne({ story_id: story._id, n });
      if (!ep) return bad("Episode not found.", 404);
      await episodes.updateOne({ _id: ep._id }, { $set: { title, content, updated_at: now } });
      await posts.updateOne({ _id: ep.post_id }, { $set: { "story.ep": title } });
      return Response.json({ status: "success", n });
    }
    if ((await episodes.countDocuments({ member_id: m._id, created_at: { $gt: new Date(Date.now() - 3600000) } })) >= 10) return bad("You are publishing too fast. Please wait a little.", 429);
    const last = await episodes.find({ story_id: story._id }).sort({ n: -1 }).limit(1).next();
    const num = (last?.n || 0) + 1;
    const postId = await nextId("community_posts");
    await posts.insertOne({ _id: postId, member_id: m._id, category_id: story.category_id, content: "", images: [], created_at: now, story: { id: story._id, n: num, title: story.title, ep: title } });
    await episodes.insertOne({ _id: await nextId("community_story_episodes"), story_id: story._id, member_id: m._id, n: num, title, content, views: 0, post_id: postId, created_at: now, updated_at: now });
    await stories.updateOne({ _id: story._id }, { $set: { episodes: num, updated_at: now } });
    return Response.json({ status: "success", n: num });
  }

  if (action === "delete_episode") {
    // only the last episode can be removed, so the numbering never has holes
    const last = await episodes.find({ story_id: story._id }).sort({ n: -1 }).limit(1).next();
    if (!last || last.n !== int("n")) return bad("Only the latest episode can be deleted. You can edit older ones.");
    await dropPost(last.post_id);
    await episodes.deleteOne({ _id: last._id });
    await stories.updateOne({ _id: story._id }, { $set: { episodes: last.n - 1 } });
    return Response.json({ status: "success" });
  }
  return bad("Unknown action.");
}
