import "server-only";
import { unstable_cache } from "next/cache";
import { col } from "./db";
import type { Product, Seller } from "./types";

export interface SellerCard {
  id: number;
  name: string;
  slug: string;
  logo: string;
  city: string;
  verified: boolean;
  shipping_fee: number;
  free_shipping_over: number;
  processing_days: number;
  return_policy: string;
}

export interface ProductView {
  id: number;
  title: string;
  slug: string;
  description: string;
  plain: boolean; // seller text → render as plain text, never HTML
  price: number;
  sale_price: number | null;
  effective: number;
  discount: number;
  stock: number;
  image: string;
  gallery: string[];
  video_url: string;
  novel_slug: string;
  writer_name: string;
  author: string;
  language: string;
  pages_count: number;
  binding: string;
  condition: string;
  isbn: string;
  tags: string[];
  views: number;
  sold: number;
  rating_avg: number;
  rating_count: number;
  seller: SellerCard | null;
  meta_title: string;
  meta_description: string;
  created_at: string;
}

export function sellerCard(s: Seller): SellerCard {
  return {
    id: s._id,
    name: s.store_name,
    slug: s.slug,
    logo: s.logo || "",
    city: s.city || "",
    verified: !!s.verified,
    shipping_fee: s.shipping_fee ?? 0,
    free_shipping_over: s.free_shipping_over ?? 0,
    processing_days: s.processing_days ?? 2,
    return_policy: s.return_policy || "",
  };
}

export const effectivePrice = (p: Pick<Product, "price" | "sale_price">) => (p.sale_price !== null && p.sale_price !== undefined && p.sale_price > 0 && p.sale_price < p.price ? p.sale_price : p.price);

/** Turn many products into views with 3 queries total (not 2 per product). */
export async function toViews(rows: Product[]): Promise<ProductView[]> {
  const postIds = [...new Set(rows.map((p) => p.post_id).filter((x): x is number => !!x))];
  const sellerIds = [...new Set(rows.map((p) => p.seller_id).filter((x): x is number => !!x))];
  const [posts, sellers] = await Promise.all([
    postIds.length ? (await col.posts()).find({ _id: { $in: postIds } }, { projection: { slug: 1, writer_id: 1 } }).toArray() : [],
    sellerIds.length ? (await col.sellers()).find({ _id: { $in: sellerIds } }).toArray() : [],
  ]);
  const writerIds = [...new Set(posts.map((p) => p.writer_id).filter((x): x is number => !!x))];
  const writers = writerIds.length ? await (await col.writers()).find({ _id: { $in: writerIds } }, { projection: { name: 1 } }).toArray() : [];
  const postMap = new Map(posts.map((p) => [p._id, p]));
  const writerMap = new Map(writers.map((w) => [w._id, w.name]));
  const sellerMap = new Map(sellers.map((s) => [s._id, sellerCard(s)]));
  return rows.map((p) => {
    const post = p.post_id ? postMap.get(p.post_id) : undefined;
    const eff = effectivePrice(p);
    const sale = eff < p.price ? eff : null;
    const writer = (post?.writer_id && writerMap.get(post.writer_id)) || "";
    return {
      id: p._id,
      title: p.title,
      slug: p.slug,
      description: p.description || "",
      plain: !!p.seller_id,
      price: p.price,
      sale_price: sale,
      effective: eff,
      discount: sale ? Math.round(((p.price - sale) / p.price) * 100) : 0,
      stock: p.stock,
      image: p.image || "",
      gallery: (p.gallery_images || []).filter(Boolean),
      video_url: p.video_url || "",
      novel_slug: post?.slug || "",
      writer_name: writer,
      author: p.author || writer,
      language: p.language || "",
      pages_count: p.pages_count || 0,
      binding: p.binding || "",
      condition: p.condition || "new",
      isbn: p.isbn || "",
      tags: p.tags || [],
      views: p.views || 0,
      sold: Math.max(0, p.sold || 0),
      rating_avg: p.rating_avg || 0,
      rating_count: p.rating_count || 0,
      seller: p.seller_id ? sellerMap.get(p.seller_id) || null : null,
      meta_title: p.meta_title || "",
      meta_description: p.meta_description || "",
      created_at: new Date(p.created_at || Date.now()).toISOString(),
    };
  });
}

export async function toView(p: Product) {
  return (await toViews([p]))[0];
}

export type ShopSort = "new" | "popular" | "price_asc" | "price_desc" | "sale";
export interface ShopQuery {
  q?: string;
  sort?: ShopSort;
  page?: number;
  seller?: number;
  inStock?: boolean;
  lang?: string;
  per?: number;
}

const PER = 24;

/** One page of the catalogue. Cached per query; busted when anything in the shop changes. */
export const listProducts = unstable_cache(
  async (opts: ShopQuery) => {
    const per = Math.min(60, opts.per || PER);
    const page = Math.max(1, Math.min(500, opts.page || 1));
    const q: Record<string, unknown> = { status: "active" };
    if (opts.seller) q.seller_id = opts.seller;
    if (opts.inStock) q.stock = { $gt: 0 };
    if (opts.lang) q.language = opts.lang;
    if (opts.sort === "sale") q.sale_price = { $gt: 0 };
    const term = (opts.q || "").trim().slice(0, 100);
    if (term) {
      const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [{ title: rx }, { author: rx }, { tags: rx }];
    }
    const sort: Record<string, 1 | -1> =
      opts.sort === "popular" ? { sold: -1, views: -1, _id: -1 } : opts.sort === "price_asc" ? { price: 1, _id: -1 } : opts.sort === "price_desc" ? { price: -1, _id: -1 } : { _id: -1 };
    const c = await col.products();
    const [rows, total] = await Promise.all([c.find(q).sort(sort).skip((page - 1) * per).limit(per).toArray(), c.countDocuments(q)]);
    return { items: await toViews(rows), total, page, pages: Math.max(1, Math.ceil(total / per)) };
  },
  ["shop-list-v2"],
  { tags: ["content", "shop"], revalidate: 600 },
);

/** Kept for older callers: first page of the newest books. */
export async function getProducts(search = "") {
  return (await listProducts({ q: search, per: 60 })).items;
}

export const getProduct = unstable_cache(
  async (slug: string) => {
    const p = await (await col.products()).findOne({ slug, status: "active" });
    return p ? toView(p) : null;
  },
  ["shop-product-v2"],
  { tags: ["content", "shop"], revalidate: 600 },
);

/** "More from this seller / author" for a product page, topped up with best sellers. */
export const getRelated = unstable_cache(
  async (id: number, sellerId: number | null, author: string) => {
    const c = await col.products();
    const or: Record<string, unknown>[] = [];
    if (sellerId) or.push({ seller_id: sellerId });
    if (author) or.push({ author });
    const same = or.length ? await c.find({ status: "active", _id: { $ne: id }, $or: or }).sort({ sold: -1, _id: -1 }).limit(8).toArray() : [];
    const fill = same.length < 8 ? await c.find({ status: "active", _id: { $nin: [id, ...same.map((x) => x._id)] } }).sort({ sold: -1, _id: -1 }).limit(8 - same.length).toArray() : [];
    return toViews([...same, ...fill]);
  },
  ["shop-related-v1"],
  { tags: ["content", "shop"], revalidate: 600 },
);

export const getStore = unstable_cache(
  async (slug: string) => {
    const s = await (await col.sellers()).findOne({ slug, status: "active" });
    if (!s) return null;
    const [count, delivered] = await Promise.all([
      (await col.products()).countDocuments({ seller_id: s._id, status: "active" }),
      (await col.orders()).countDocuments({ seller_id: s._id, status: "completed" }),
    ]);
    return { ...sellerCard(s), bio: s.bio || "", banner: s.banner || "", since: new Date(s.created_at).toISOString(), books: count, delivered };
  },
  ["shop-store-v1"],
  { tags: ["content", "shop"], revalidate: 600 },
);

export const getReviews = unstable_cache(
  async (productId: number) => {
    const rows = await (await col.reviews()).find({ product_id: productId, status: "approved" }).sort({ _id: -1 }).limit(30).toArray();
    return rows.map((r) => ({ id: r._id, name: r.name, rating: r.rating, text: r.text, date: new Date(r.created_at).toISOString() }));
  },
  ["shop-reviews-v1"],
  { tags: ["content", "shop"], revalidate: 600 },
);

export function shippingFor(subtotal: number, fee: number, freeOver: number) {
  return freeOver > 0 && subtotal >= freeOver ? 0 : fee;
}

/** Discord webhook (same as lib/notifications.php). */
export async function notifyDiscord(content: string) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: content.slice(0, 1900) }), signal: AbortSignal.timeout(8000) }).catch(() => {});
}
