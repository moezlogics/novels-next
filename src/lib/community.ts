import "server-only";
import { col } from "./db";
import type { CommunityPost } from "./types";

export interface FeedPost {
  id: number;
  member_id: number;
  category_id: number | null;
  category_name: string;
  content: string;
  images: string[];
  created_at: string;
  author_name: string;
  author_username: string;
  author_avatar: string;
  likes_count: number;
  comments_count: number;
  views: number;
  user_liked: boolean;
}

export async function hydratePosts(posts: CommunityPost[], viewerId: number | null): Promise<FeedPost[]> {
  if (!posts.length) return [];
  const ids = posts.map((p) => p._id);
  const [members, cats, likes, comments, mine] = await Promise.all([
    (await col.members()).find({ _id: { $in: [...new Set(posts.map((p) => p.member_id))] } }, { projection: { name: 1, username: 1, profile_pic: 1 } }).toArray(),
    (await col.categories()).find({ _id: { $in: posts.map((p) => p.category_id).filter((x): x is number => !!x) } }, { projection: { name: 1 } }).toArray(),
    (await col.communityLikes()).aggregate<{ _id: number; n: number }>([{ $match: { post_id: { $in: ids } } }, { $group: { _id: "$post_id", n: { $sum: 1 } } }]).toArray(),
    (await col.communityComments()).aggregate<{ _id: number; n: number }>([{ $match: { post_id: { $in: ids } } }, { $group: { _id: "$post_id", n: { $sum: 1 } } }]).toArray(),
    viewerId ? (await col.communityLikes()).find({ member_id: viewerId, post_id: { $in: ids } }).toArray() : [],
  ]);
  const mm = new Map(members.map((m) => [m._id, m]));
  const cm = new Map(cats.map((c) => [c._id, c.name]));
  const lm = new Map(likes.map((l) => [l._id, l.n]));
  const ccm = new Map(comments.map((c) => [c._id, c.n]));
  const liked = new Set(mine.map((l) => l.post_id));
  return posts.map((p) => {
    const m = mm.get(p.member_id);
    const pic = m?.profile_pic && !/default_avatar/i.test(m.profile_pic) ? m.profile_pic : "";
    return {
      id: p._id,
      member_id: p.member_id,
      category_id: p.category_id,
      category_name: (p.category_id && cm.get(p.category_id)) || "",
      content: p.content,
      images: p.images || [],
      created_at: new Date(p.created_at).toISOString(),
      author_name: m?.name || "Reader",
      author_username: m?.username || "",
      author_avatar: pic,
      likes_count: lm.get(p._id) || 0,
      comments_count: ccm.get(p._id) || 0,
      views: p.views || 0,
      user_liked: liked.has(p._id),
    };
  });
}

/** "For You" ranking — same formula as community_api.php. */
export function rankPosts(posts: FeedPost[], affinities: Record<number, number>, viewerId: number | null, seed: number) {
  const now = Date.now();
  return posts
    .map((p) => {
      const age = Math.max(0.1, (now - new Date(p.created_at).getTime()) / 3600000);
      const recency = 1 / (1 + Math.pow(age, 1.2));
      const engagement = 1 + p.likes_count * 2.5 + p.comments_count * 6;
      const aff = p.category_id && affinities[p.category_id] ? 1 + 0.35 * Math.min(20, affinities[p.category_id]) : 1;
      const own = viewerId && p.member_id === viewerId ? 0.85 : 1;
      const rand = 0.88 + 0.24 * Math.abs(Math.sin(p.id + seed));
      return { p, s: engagement * recency * aff * rand * own };
    })
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
}
