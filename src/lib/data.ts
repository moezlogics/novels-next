import "server-only";
import { unstable_cache } from "next/cache";
import { col } from "./db";
import { extractDriveId } from "./utils";
import type { Post, PostCard } from "./types";

const TAGS = { tags: ["content"], revalidate: 3600 };

function escRx(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function writerNames(ids: (number | null)[]): Promise<Map<number, { name: string; slug: string }>> {
  const uniq = [...new Set(ids.filter((x): x is number => typeof x === "number"))];
  const map = new Map<number, { name: string; slug: string }>();
  if (!uniq.length) return map;
  const rows = await (await col.writers()).find({ _id: { $in: uniq } }, { projection: { name: 1, slug: 1 } }).toArray();
  rows.forEach((w) => map.set(w._id, { name: w.name, slug: w.slug }));
  return map;
}

async function toCards(posts: Pick<Post, "_id" | "title" | "slug" | "image" | "writer_id">[]): Promise<PostCard[]> {
  const wm = await writerNames(posts.map((p) => p.writer_id));
  return posts.map((p) => ({
    id: p._id,
    title: p.title,
    slug: p.slug,
    image: p.image || "",
    writer_name: (p.writer_id && wm.get(p.writer_id)?.name) || "Unknown Author",
  }));
}

const CARD_PROJ = { title: 1, slug: 1, image: 1, writer_id: 1 } as const;

// ── Navigation ───────────────────────────────────────────────
export interface NavLink {
  label: string;
  url: string;
  children: NavLink[];
}

async function buildTree(kind: "menu" | "footerMenu"): Promise<{ id: number; label: string; url: string; parent_id: number; children: { id: number; label: string; url: string }[] }[]> {
  const rows = await (await col[kind]()).find({}).sort({ sort_order: 1, _id: 1 }).toArray();
  const byId = new Map(rows.map((r) => [r._id, { id: r._id, label: r.label, url: r.url, parent_id: r.parent_id || 0, children: [] as { id: number; label: string; url: string }[] }]));
  const roots: ReturnType<typeof byId.get>[] = [];
  for (const item of byId.values()) {
    if (item.parent_id && byId.has(item.parent_id)) byId.get(item.parent_id)!.children.push({ id: item.id, label: item.label, url: item.url });
    else roots.push(item);
  }
  return roots as NonNullable<ReturnType<typeof byId.get>>[];
}

export const getNavMenu = unstable_cache(async () => buildTree("menu"), ["nav-menu"], TAGS);
export const getFooterMenu = unstable_cache(async () => buildTree("footerMenu"), ["footer-menu"], TAGS);

// ── Home ─────────────────────────────────────────────────────
export const getCarouselCategories = unstable_cache(
  async () => {
    const rows = await (await col.categories()).find({}, { projection: { name: 1, slug: 1, image: 1 } }).sort({ name: 1 }).toArray();
    return rows.map((c) => ({ id: c._id, name: c.name, slug: c.slug, image: c.image || "" }));
  },
  ["carousel-cats"],
  TAGS,
);

export const getRecentPosts = unstable_cache(
  async (limit: number = 8) => {
    const rows = await (await col.posts()).find({ status: "active" }, { projection: CARD_PROJ }).sort({ _id: -1 }).limit(limit).toArray();
    return toCards(rows);
  },
  ["recent-posts"],
  TAGS,
);

export const getPostsByIdsOrdered = unstable_cache(
  async (ids: number[]) => {
    if (!ids.length) return [];
    const rows = await (await col.posts()).find({ _id: { $in: ids }, status: "active" }, { projection: CARD_PROJ }).toArray();
    const cards = await toCards(rows);
    const byId = new Map(cards.map((c) => [c.id, c]));
    return ids.map((id) => byId.get(id)).filter(Boolean) as PostCard[];
  },
  ["posts-by-ids"],
  TAGS,
);

export const getTrendingPosts = unstable_cache(
  async (limit: number = 8) => {
    const rows = await (await col.posts())
      .find({ status: "active", $or: [{ reads: { $gt: 0 } }, { views: { $gt: 0 } }] }, { projection: CARD_PROJ })
      .sort({ reads: -1, views: -1 })
      .limit(limit)
      .toArray();
    return toCards(rows);
  },
  ["trending-posts"],
  { tags: ["content"], revalidate: 900 },
);

// ── Slug resolution (category → writer → post → page, same order as router.php) ──
export type SlugKind = { kind: "category"; id: number } | { kind: "writer"; id: number } | { kind: "post"; id: number } | { kind: "page"; id: number } | { kind: "none" };

export const resolveSlug = unstable_cache(
  async (slug: string): Promise<SlugKind> => {
    const s = decodeURIComponent(slug).toLowerCase();
    const cat = await (await col.categories()).findOne({ slug: s }, { projection: { _id: 1 } });
    if (cat) return { kind: "category", id: cat._id };
    const w = await (await col.writers()).findOne({ slug: s }, { projection: { _id: 1 } });
    if (w) return { kind: "writer", id: w._id };
    const p = await (await col.posts()).findOne({ slug: s, status: "active" }, { projection: { _id: 1 } });
    if (p) return { kind: "post", id: p._id };
    const pg = await (await col.pages()).findOne({ slug: s, status: "publish" }, { projection: { _id: 1 } });
    if (pg) return { kind: "page", id: pg._id };
    return { kind: "none" };
  },
  ["resolve-slug"],
  TAGS,
);

// ── Single novel ─────────────────────────────────────────────
export interface NovelDetail {
  id: number;
  title: string;
  slug: string;
  description: string;
  image: string;
  read_online_url: string;
  episodes: { title: string; links: { url: string; label: string; driveId: string }[] }[];
  pdf_size: number;
  download_url: string;
  file_size: string;
  file_type: string;
  pages: number | null;
  posted_date: string;
  updated_at: string;
  meta_title: string;
  meta_description: string;
  writer: { id: number; name: string; slug: string; short_bio: string; profile_pic: string } | null;
  category: { id: number; name: string; slug: string } | null;
  categories: { name: string; slug: string }[];
  series: { name: string; slug: string } | null;
  season_number: number | null;
  seasons: { id: number; title: string; slug: string; season_number: number | null }[];
  relatedWriter: PostCard[];
  relatedCategory: PostCard[];
  product: { slug: string; price: number; sale_price: number | null; stock: number } | null;
}

export const getNovel = unstable_cache(
  async (id: number): Promise<NovelDetail | null> => {
    const p = await (await col.posts()).findOne({ _id: id });
    if (!p) return null;
    const [writer, cats, series, product] = await Promise.all([
      p.writer_id ? (await col.writers()).findOne({ _id: p.writer_id }) : null,
      (await col.categories()).find({ _id: { $in: p.category_ids || [] } }, { projection: { name: 1, slug: 1 } }).toArray(),
      p.series_id ? (await col.series()).findOne({ _id: p.series_id }) : null,
      (await col.products()).findOne({ post_id: p._id, status: "active" }, { projection: { slug: 1, price: 1, sale_price: 1, stock: 1 } }),
    ]);
    const catById = new Map(cats.map((c) => [c._id, c]));
    const categories = (p.category_ids || []).map((cid) => catById.get(cid)).filter(Boolean).map((c) => ({ name: c!.name, slug: c!.slug }));
    const primary = p.category_id ? catById.get(p.category_id) : null;

    const posts = await col.posts();
    const seasonsRaw = p.series_id
      ? await posts.find({ series_id: p.series_id, status: "active" }, { projection: { title: 1, slug: 1, season_number: 1 } }).sort({ season_number: 1, _id: 1 }).toArray()
      : [];
    const relW = p.writer_id
      ? await posts.find({ writer_id: p.writer_id, _id: { $ne: p._id }, status: "active" }, { projection: CARD_PROJ }).sort({ _id: -1 }).limit(4).toArray()
      : [];
    const exclude = [p._id, ...seasonsRaw.map((s) => s._id), ...relW.map((r) => r._id)];
    const relC = p.category_id
      ? await posts.find({ status: "active", _id: { $nin: exclude }, category_ids: p.category_id }, { projection: CARD_PROJ }).sort({ _id: -1 }).limit(4).toArray()
      : [];

    return {
      id: p._id,
      title: p.title,
      slug: p.slug,
      description: p.description || "",
      image: p.image || "",
      read_online_url: p.read_online_url || "",
      episodes: (p.episodes || [])
        .map((e, i) => ({ title: e.title || `Episode ${i + 1}`, links: (e.links || []).filter((l) => l?.url).map((l) => ({ url: l.url, label: l.label || "", driveId: extractDriveId(l.url) || "" })) }))
        .filter((e) => e.links.length),
      pdf_size: p.pdf_size || 0,
      download_url: p.download_url || "",
      file_size: p.file_size || "",
      file_type: p.file_type || "",
      pages: p.pages ?? null,
      posted_date: new Date(p.posted_date).toISOString(),
      updated_at: new Date(p.updated_at || p.posted_date).toISOString(),
      meta_title: p.meta_title || "",
      meta_description: p.meta_description || "",
      writer: writer ? { id: writer._id, name: writer.name, slug: writer.slug, short_bio: writer.short_bio || "", profile_pic: writer.profile_pic || "" } : null,
      category: primary ? { id: primary._id, name: primary.name, slug: primary.slug } : null,
      categories,
      series: series ? { name: series.name, slug: series.slug } : null,
      season_number: p.season_number ?? null,
      seasons: seasonsRaw.map((s) => ({ id: s._id, title: s.title, slug: s.slug, season_number: s.season_number ?? null })),
      relatedWriter: await toCards(relW),
      relatedCategory: await toCards(relC),
      product: product ? { slug: product.slug, price: product.price, sale_price: product.sale_price ?? null, stock: product.stock } : null,
    };
  },
  ["novel-v1"],
  TAGS,
);

export interface CommentView {
  id: number;
  parent_id: number | null;
  reply_to: string;
  name: string;
  is_admin: boolean;
  message: string;
  created_at: string;
  avatar: string;
  /** Only on the reader's own just-posted comment while it waits for review. */
  pending?: boolean;
}

export function toCommentView(r: { _id: number; parent_id: number | null; reply_to?: string | null; name: string; is_admin: boolean; message: string; created_at: Date }, avatar = ""): CommentView {
  return {
    id: r._id,
    parent_id: r.parent_id ?? null,
    reply_to: r.reply_to || "",
    name: r.name,
    is_admin: !!r.is_admin,
    message: r.message,
    created_at: new Date(r.created_at).toISOString(),
    avatar: avatar && !/default_avatar/i.test(avatar) ? avatar : "",
  };
}

async function loadComments(postId: number): Promise<CommentView[]> {
  const rows = await (await col.comments())
    .find({ post_id: postId, status: "approved" }, { projection: { email: 0, ip_address: 0, msg_hash: 0, flag_reason: 0 } })
    .sort({ _id: 1 })
    .limit(1000)
    .toArray();
  const mids = [...new Set(rows.map((r) => r.member_id).filter((x): x is number => !!x))];
  const members = mids.length ? await (await col.members()).find({ _id: { $in: mids } }, { projection: { profile_pic: 1 } }).toArray() : [];
  const pics = new Map(members.map((m) => [m._id, m.profile_pic || ""]));
  return rows.map((r) => toCommentView(r, r.member_id ? pics.get(r.member_id) || "" : ""));
}

/** Cached per novel: a new comment only refreshes that novel's page, not the whole site. */
export function getComments(postId: number): Promise<CommentView[]> {
  return unstable_cache(() => loadComments(postId), ["comments-v2", String(postId)], {
    tags: ["content", "comments", `comments-${postId}`],
    revalidate: 3600,
  })();
}

// ── Archives ─────────────────────────────────────────────────
export const getCategory = unstable_cache(
  async (id: number) => {
    const c = await (await col.categories()).findOne({ _id: id });
    return c ? { id: c._id, name: c.name, slug: c.slug, description: c.description || "", image: c.image || "", meta_title: c.meta_title || "", meta_description: c.meta_description || "" } : null;
  },
  ["category-v1"],
  TAGS,
);

export const getWriter = unstable_cache(
  async (id: number) => {
    const w = await (await col.writers()).findOne({ _id: id });
    return w
      ? { id: w._id, name: w.name, slug: w.slug, bio: w.bio || "", short_bio: w.short_bio || "", profile_pic: w.profile_pic || "", meta_title: w.meta_title || "", meta_description: w.meta_description || "" }
      : null;
  },
  ["writer-v1"],
  TAGS,
);

export interface ArchiveFilter {
  categoryId?: number;
  writerId?: number;
  search?: string;
}

function archiveQuery(f: ArchiveFilter) {
  const q: Record<string, unknown> = { status: "active" };
  if (f.categoryId) q.category_ids = f.categoryId;
  if (f.writerId) q.writer_id = f.writerId;
  return q;
}

export const getArchive = unstable_cache(
  async (f: ArchiveFilter, page: number = 1, limit: number = 12) => {
    const posts = await col.posts();
    let q = archiveQuery(f);
    if (f.search) {
      const rx = new RegExp(escRx(f.search.trim()), "i");
      // title / description / writer name (same as PHP LIKE search)
      const writers = await (await col.writers()).find({ name: rx }, { projection: { _id: 1 } }).toArray();
      q = { ...q, $or: [{ title: rx }, { description: rx }, ...(writers.length ? [{ writer_id: { $in: writers.map((w) => w._id) } }] : [])] };
    }
    const [total, rows] = await Promise.all([
      posts.countDocuments(q),
      posts.find(q, { projection: CARD_PROJ }).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    ]);
    return { total, totalPages: Math.ceil(total / limit), items: await toCards(rows) };
  },
  ["archive-v1"],
  TAGS,
);

/** Live search (header) — title or writer name, newest first. */
export async function liveSearch(q: string, limit = 12): Promise<PostCard[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const rx = new RegExp(escRx(term), "i");
  const writers = await (await col.writers()).find({ name: rx }, { projection: { _id: 1 } }).toArray();
  const rows = await (await col.posts())
    .find({ status: "active", $or: [{ title: rx }, ...(writers.length ? [{ writer_id: { $in: writers.map((w) => w._id) } }] : [])] }, { projection: CARD_PROJ })
    .sort({ _id: -1 })
    .limit(limit)
    .toArray();
  return toCards(rows);
}

export const getCategoriesWithCounts = unstable_cache(
  async () => {
    const cats = await (await col.categories()).find({ slug: { $gt: "" } }).sort({ name: 1 }).toArray();
    const counts = await (await col.posts())
      .aggregate<{ _id: number; n: number }>([{ $match: { status: "active" } }, { $unwind: "$category_ids" }, { $group: { _id: "$category_ids", n: { $sum: 1 } } }])
      .toArray();
    const cm = new Map(counts.map((c) => [c._id, c.n]));
    return cats.map((c) => ({ id: c._id, name: c.name, slug: c.slug, description: c.description || "", image: c.image || "", count: cm.get(c._id) || 0 }));
  },
  ["cats-with-counts"],
  TAGS,
);

export const getPage = unstable_cache(
  async (id: number) => {
    const p = await (await col.pages()).findOne({ _id: id });
    return p
      ? { id: p._id, title: p.title, slug: p.slug, content: p.content || "", meta_title: p.meta_title || "", meta_description: p.meta_description || "", created_at: new Date(p.created_at).toISOString(), updated_at: new Date(p.updated_at).toISOString() }
      : null;
  },
  ["page-v1"],
  TAGS,
);

export async function getCardsByIds(ids: number[]) {
  if (!ids.length) return [];
  const rows = await (await col.posts()).find({ _id: { $in: ids }, status: "active" }, { projection: { ...CARD_PROJ, pages: 1 } }).toArray();
  const cards = await toCards(rows);
  const pages = new Map(rows.map((r) => [r._id, (r as Post).pages || 0]));
  return cards.map((c) => ({ ...c, pages: pages.get(c.id) || 0 }));
}
