import "server-only";
import { revalidateTag } from "next/cache";
import { col, nextId } from "./db";
import { getSettings } from "./settings";
import { aiOpinion, checkListing, contactBlocks, plainText } from "./spamBrain";
import { slugify } from "./utils";
import type { Order, OrderStatus, Product, Seller, Settings } from "./types";

export const ORDER_FLOW: OrderStatus[] = ["pending", "processing", "shipped", "completed"];
export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "New",
  processing: "Packing",
  shipped: "Shipped",
  completed: "Delivered",
  cancelled: "Cancelled",
};

export function bustShop() {
  revalidateTag("shop", { expire: 0 });
  revalidateTag("sitemap", { expire: 0 });
}

export async function uniqueProductSlug(base: string, exclude?: number) {
  const c = await col.products();
  const root = slugify(base).slice(0, 90) || "book";
  let slug = root;
  for (let n = 2; n < 500; n++) {
    if (!(await c.findOne({ slug, ...(exclude ? { _id: { $ne: exclude } } : {}) }, { projection: { _id: 1 } }))) return slug;
    slug = `${root}-${n}`;
  }
  return `${root}-${Date.now()}`;
}

export async function uniqueSellerSlug(base: string, exclude?: number) {
  const c = await col.sellers();
  const root = slugify(base).slice(0, 60) || "store";
  let slug = root;
  for (let n = 2; n < 500; n++) {
    if (!(await c.findOne({ slug, ...(exclude ? { _id: { $ne: exclude } } : {}) }, { projection: { _id: 1 } }))) return slug;
    slug = `${root}-${n}`;
  }
  return `${root}-${Date.now()}`;
}

export function brainRules(s: Settings) {
  return {
    minPrice: s.seller_min_price ?? 100,
    maxPrice: s.seller_max_price ?? 25000,
    bannedWords: (s.seller_banned_words || "")
      .split(/\r?\n|,/)
      .map((w) => w.trim())
      .filter(Boolean),
  };
}

/** Store profile text must never carry contact details either. */
export function checkStoreProfile(p: { store_name: string; bio: string; return_policy: string; city: string }) {
  return contactBlocks({ "Store name": p.store_name, About: p.bio, "Return policy": p.return_policy, City: p.city });
}

export interface ProductDraft {
  title: string;
  author: string;
  description: string;
  price: number;
  sale_price: number | null;
  stock: number;
  language: string;
  pages_count: number;
  binding: "paperback" | "hardcover" | "";
  condition: "new" | "used";
  isbn: string;
  tags: string[];
  image: string;
  gallery_images: string[];
  hidden: boolean; // seller paused the listing
}

/**
 * Save a seller's product through the spam brain.
 * Returns the saved id and what happened, or the problems the seller must fix.
 */
export async function saveSellerProduct(seller: Seller, draft: ProductDraft, id: number | null): Promise<{ ok: true; id: number; status: Product["status"]; note: string } | { ok: false; errors: string[] }> {
  const s = await getSettings();
  const products = await col.products();
  const existing = id ? await products.findOne({ _id: id, seller_id: seller._id }) : null;
  if (id && !existing) return { ok: false, errors: ["Product not found."] };

  const d = { ...draft, title: plainText(draft.title, 160), author: plainText(draft.author, 120), description: plainText(draft.description, 5000), isbn: draft.isbn.replace(/[^\dxX-]/g, "").slice(0, 20) };
  const errors: string[] = [];
  if (d.title.length < 3) errors.push("Enter the book title.");
  if (!(d.price > 0)) errors.push("Enter the price.");
  if (d.stock < 0 || d.stock > 100000) errors.push("Stock must be between 0 and 100,000.");
  if (!d.image) errors.push("Add a cover photo of the book.");
  const maxImg = s.seller_max_images ?? 6;
  if (d.gallery_images.length + 1 > maxImg) errors.push(`At most ${maxImg} photos per product.`);

  // daily limit for new products
  if (!existing) {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const today = await products.countDocuments({ seller_id: seller._id, created_at: { $gte: since } });
    if (today >= (s.seller_daily_limit ?? 10)) errors.push(`You can add up to ${s.seller_daily_limit ?? 10} new products per day. Please try again tomorrow.`);
  }

  const brain = checkListing({ title: d.title, description: d.description, author: d.author, tags: d.tags, price: d.price, salePrice: d.sale_price }, brainRules(s));
  errors.push(...brain.blocks);
  if (errors.length) {
    if (brain.blocks.length) await (await col.sellers()).updateOne({ _id: seller._id }, { $inc: { strikes: 1 } });
    return { ok: false, errors: [...new Set(errors)] };
  }

  // same title twice from one seller = duplicate listing
  const dup = await products.findOne({ seller_id: seller._id, title: new RegExp(`^${d.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), ...(existing ? { _id: { $ne: existing._id } } : {}) }, { projection: { _id: 1 } });
  const reasons = [...brain.reasons];
  let score = brain.score;
  if (dup) {
    score += 30;
    reasons.push("Same title as another of this seller's products");
  }
  if (seller.strikes >= 5) {
    score += 15;
    reasons.push(`Seller has ${seller.strikes} blocked attempts`);
  }
  const textChanged = !existing || existing.title !== d.title || existing.description !== d.description;
  if (textChanged && score < 100) {
    const ai = await aiOpinion(`Title: ${d.title}\nAuthor: ${d.author}\nPrice: Rs ${d.price}\n\n${d.description}`);
    if (ai.flag) {
      score = Math.max(score, s.seller_spam_threshold ?? 45);
      reasons.push(`AI check: ${ai.reason || "looks suspicious"}`);
    }
  }

  const reviewFirst = s.seller_review_first ?? 3;
  let status: Product["status"];
  let note: string;
  const alreadyApproved = existing?.status === "active" || existing?.status === "inactive";
  if (d.hidden && (alreadyApproved || !textChanged)) {
    status = "inactive";
    note = "Saved. The book is hidden from the store.";
  } else if (score >= (s.seller_spam_threshold ?? 45)) {
    status = "pending";
    note = "Saved. An admin will check this listing before it goes live.";
  } else if (!alreadyApproved && seller.approved_products < reviewFirst) {
    status = "pending";
    reasons.push(`New seller: first ${reviewFirst} products are checked by an admin`);
    note = `Saved. Your first ${reviewFirst} books are checked by an admin, usually within a day.`;
  } else if (existing && !alreadyApproved && existing.status === "pending" && !textChanged) {
    status = "pending";
    note = "Saved. Still waiting for admin review.";
  } else {
    status = d.hidden ? "inactive" : "active";
    note = d.hidden ? "Saved. The book is hidden from the store." : "Published ✓ Your book is live in the store.";
  }

  const doc = {
    title: d.title,
    author: d.author,
    description: d.description,
    price: Math.round(d.price),
    sale_price: d.sale_price && d.sale_price > 0 ? Math.round(d.sale_price) : null,
    stock: Math.floor(d.stock),
    language: d.language,
    pages_count: Math.max(0, Math.floor(d.pages_count || 0)),
    binding: d.binding,
    condition: d.condition,
    isbn: d.isbn,
    tags: d.tags.slice(0, 10),
    image: d.image,
    gallery_images: d.gallery_images.slice(0, Math.max(0, maxImg - 1)),
    status,
    spam_score: score,
    review_reasons: status === "pending" ? reasons : [],
    updated_at: new Date(),
  };

  let pid: number;
  if (existing) {
    pid = existing._id;
    const slug = existing.title === d.title ? existing.slug : await uniqueProductSlug(`${d.title}${d.author ? ` by ${d.author}` : ""}`, pid);
    await products.updateOne({ _id: pid }, { $set: { ...doc, slug } });
  } else {
    pid = await nextId("products");
    await products.insertOne({
      _id: pid,
      ...doc,
      post_id: null,
      seller_id: seller._id,
      slug: await uniqueProductSlug(`${d.title}${d.author ? ` by ${d.author}` : ""}`),
      video_url: "",
      meta_title: "",
      meta_description: "",
      views: 0,
      sold: 0,
      created_at: new Date(),
    });
  }
  bustShop();
  return { ok: true, id: pid, status, note };
}

/** Admin decision on a product in the review queue. */
export async function reviewProduct(id: number, approve: boolean, by: string, reason = "") {
  const products = await col.products();
  const p = await products.findOne({ _id: id });
  if (!p) return;
  await products.updateOne({ _id: id }, { $set: { status: approve ? "active" : "rejected", reviewed_by: by, reviewed_at: new Date(), review_reasons: approve ? [] : [reason || "Rejected by admin"] } });
  if (approve && p.seller_id && p.status !== "active") await (await col.sellers()).updateOne({ _id: p.seller_id }, { $inc: { approved_products: 1 } });
  bustShop();
}

/** Count a product page view (one document per product per day). */
export async function recordProductView(p: { id: number; seller_id: number | null }) {
  const day = new Date().toISOString().slice(0, 10);
  await Promise.all([
    (await col.productViews()).updateOne({ _id: `${p.id}:${day}` }, { $inc: { views: 1 }, $setOnInsert: { product_id: p.id, seller_id: p.seller_id, day } }, { upsert: true }),
    (await col.products()).updateOne({ _id: p.id }, { $inc: { views: 1 } }),
  ]);
}

/** Move an order along. Cancelling puts the stock back (once). */
export async function setOrderStatus(order: Order, status: OrderStatus, by: string, extra: { courier?: string; tracking_number?: string; note?: string } = {}) {
  const orders = await col.orders();
  const set: Partial<Order> = { status, updated_at: new Date() };
  if (extra.courier !== undefined) set.courier = extra.courier.slice(0, 60);
  if (extra.tracking_number !== undefined) set.tracking_number = extra.tracking_number.slice(0, 60);
  await orders.updateOne({ _id: order._id }, { $set: set, $push: { history: { status, at: new Date(), by, ...(extra.note ? { note: extra.note.slice(0, 200) } : {}) } } });
  const products = await col.products();
  if (status === "cancelled" && order.status !== "cancelled") {
    for (const it of order.items) await products.updateOne({ _id: it.product_id }, { $inc: { stock: it.quantity, sold: -it.quantity } });
  } else if (order.status === "cancelled" && status !== "cancelled") {
    for (const it of order.items) await products.updateOne({ _id: it.product_id }, { $inc: { stock: -it.quantity, sold: it.quantity } });
  }
  bustShop();
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Everything the seller dashboard shows. */
export async function sellerStats(sellerId: number) {
  const since = new Date(Date.now() - 29 * 24 * 3600 * 1000);
  since.setUTCHours(0, 0, 0, 0);
  const [products, orders, views] = await Promise.all([
    (await col.products()).find({ seller_id: sellerId }, { projection: { title: 1, slug: 1, image: 1, status: 1, stock: 1, views: 1, sold: 1, price: 1, sale_price: 1 } }).toArray(),
    (await col.orders()).find({ seller_id: sellerId }, { projection: { status: 1, total: 1, subtotal: 1, created_at: 1, items: 1 } }).sort({ _id: -1 }).limit(5000).toArray(),
    (await col.productViews()).find({ seller_id: sellerId, day: { $gte: dayKey(since) } }).toArray(),
  ]);
  const days: { day: string; views: number; orders: number; revenue: number }[] = [];
  for (let i = 0; i < 30; i++) days.push({ day: dayKey(new Date(since.getTime() + i * 86400000)), views: 0, orders: 0, revenue: 0 });
  const byDay = new Map(days.map((d) => [d.day, d]));
  for (const v of views) {
    const d = byDay.get(v.day);
    if (d) d.views += v.views;
  }
  let revenue = 0;
  let pendingRevenue = 0;
  const count: Record<OrderStatus, number> = { pending: 0, processing: 0, shipped: 0, completed: 0, cancelled: 0 };
  for (const o of orders) {
    count[o.status as OrderStatus] = (count[o.status as OrderStatus] || 0) + 1;
    if (o.status === "completed") revenue += o.subtotal;
    else if (o.status !== "cancelled") pendingRevenue += o.subtotal;
    const d = byDay.get(dayKey(new Date(o.created_at)));
    if (d && o.status !== "cancelled") {
      d.orders += 1;
      d.revenue += o.subtotal;
    }
  }
  const totalViews = products.reduce((a, p) => a + (p.views || 0), 0);
  const sold = products.reduce((a, p) => a + Math.max(0, p.sold || 0), 0);
  const live = orders.filter((o) => o.status !== "cancelled").length;
  return {
    products: {
      total: products.length,
      active: products.filter((p) => p.status === "active").length,
      pending: products.filter((p) => p.status === "pending").length,
      rejected: products.filter((p) => p.status === "rejected").length,
      outOfStock: products.filter((p) => p.status === "active" && p.stock <= 0).length,
    },
    orders: { total: orders.length, ...count },
    revenue,
    pendingRevenue,
    sold,
    views: totalViews,
    conversion: totalViews ? Math.round((live / totalViews) * 1000) / 10 : 0,
    days,
    top: [...products].sort((a, b) => (b.sold || 0) - (a.sold || 0) || (b.views || 0) - (a.views || 0)).slice(0, 5),
  };
}

/** Admin overview numbers for every seller in one query each. */
export async function sellersOverview() {
  const [p, o] = await Promise.all([
    (await col.products()).aggregate<{ _id: number; n: number; live: number; pending: number }>([{ $match: { seller_id: { $gt: 0 } } }, { $group: { _id: "$seller_id", n: { $sum: 1 }, live: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } }, pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } } } }]).toArray(),
    (await col.orders()).aggregate<{ _id: number; n: number; revenue: number }>([{ $match: { seller_id: { $gt: 0 }, status: { $ne: "cancelled" } } }, { $group: { _id: "$seller_id", n: { $sum: 1 }, revenue: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$subtotal", 0] } } } }]).toArray(),
  ]);
  return { products: new Map(p.map((x) => [x._id, x])), orders: new Map(o.map((x) => [x._id, x])) };
}
