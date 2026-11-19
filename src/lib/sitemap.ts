import "server-only";
import { unstable_cache } from "next/cache";
import { col } from "./db";
import { getSettings, siteUrl } from "./settings";

export const SITEMAP_CHUNK = 5000; // max URLs per sub-sitemap (Google allows 50,000)
export type SubSitemapKind = "posts" | "categories" | "writers" | "pages" | "shop";

interface UrlEntry {
  loc: string;
  changefreq: string;
  priority: string;
  lastmod?: Date | string | null;
}

interface IndexEntry {
  loc: string;
  lastmod: string;
}

const RESERVED_PAGE_SLUGS = new Set(["categories", "about", "contact"]);

const esc = (s: string) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function toIso(d?: Date | string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString();
}

function maxIso(dates: (Date | string | null | undefined)[]): string {
  let best = 0;
  for (const d of dates) {
    if (!d) continue;
    const t = new Date(d).getTime();
    if (!Number.isNaN(t) && t > best) best = t;
  }
  return best ? new Date(best).toISOString() : "";
}

function subUrl(base: string, kind: SubSitemapKind, page: number): string {
  return page <= 1 ? `${base}/sitemap-${kind}.xml` : `${base}/sitemap-${kind}-${page}.xml`;
}

function renderIndex(entries: IndexEntry[]): string {
  const body = entries
    .map(
      (e) =>
        `  <sitemap>\n    <loc>${esc(e.loc)}</loc>\n${e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : ""}  </sitemap>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

function renderUrlset(base: string, entries: UrlEntry[]): string {
  const body = entries
    .map((e) => {
      const lm = toIso(e.lastmod);
      return `  <url>\n    <loc>${esc(base + e.loc)}</loc>\n${lm ? `    <lastmod>${lm}</lastmod>\n` : ""}    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

async function getCategoryLastmods(ids?: number[]): Promise<Map<number, Date>> {
  const match: Record<string, unknown> = { status: "active", category_ids: ids ? { $in: ids } : { $exists: true, $ne: [] } };
  const rows = await (await col.posts())
    .aggregate<{ _id: number; last: Date }>([
      { $match: match },
      { $unwind: "$category_ids" },
      ...(ids ? [{ $match: { category_ids: { $in: ids } } }] : []),
      { $group: { _id: "$category_ids", last: { $max: { $ifNull: ["$updated_at", "$posted_date"] } } } },
    ])
    .toArray();
  return new Map(rows.map((r) => [r._id, r.last]));
}

async function getWriterLastmods(ids?: number[]): Promise<Map<number, Date>> {
  const match: Record<string, unknown> = { status: "active", writer_id: ids ? { $in: ids } : { $ne: null } };
  const rows = await (await col.posts())
    .aggregate<{ _id: number; last: Date }>([
      { $match: match },
      { $group: { _id: "$writer_id", last: { $max: { $ifNull: ["$updated_at", "$posted_date"] } } } },
    ])
    .toArray();
  return new Map(rows.map((r) => [r._id, r.last]));
}

async function fetchPages() {
  const rows = await (await col.pages())
    .find({ status: "publish", slug: { $gt: "", $nin: [...RESERVED_PAGE_SLUGS] } }, { projection: { slug: 1, created_at: 1, updated_at: 1 } })
    .sort({ _id: -1 })
    .toArray();
  const out: UrlEntry[] = [
    { loc: "/", changefreq: "daily", priority: "1.0" },
    { loc: "/about/", changefreq: "monthly", priority: "0.5" },
    { loc: "/contact/", changefreq: "monthly", priority: "0.5" },
  ];
  for (const p of rows) {
    out.push({ loc: `/${p.slug}/`, changefreq: "monthly", priority: "0.6", lastmod: p.updated_at || p.created_at });
  }
  return out;
}

async function fetchShop(): Promise<UrlEntry[]> {
  const [products, sellers] = await Promise.all([
    (await col.products())
      .find({ status: "active", slug: { $gt: "" } }, { projection: { slug: 1, updated_at: 1, created_at: 1 } })
      .sort({ _id: -1 })
      .toArray(),
    (await col.sellers())
      .find({ status: "active", slug: { $gt: "" } }, { projection: { slug: 1, updated_at: 1 } })
      .sort({ _id: -1 })
      .toArray(),
  ]);
  return [
    { loc: "/shop/", changefreq: "daily", priority: "0.7" },
    ...products.map((p) => ({
      loc: `/shop/${p.slug}/`,
      changefreq: "weekly",
      priority: "0.6",
      lastmod: p.updated_at || p.created_at,
    })),
    ...sellers.map((x) => ({
      loc: `/shop/seller/${x.slug}/`,
      changefreq: "weekly",
      priority: "0.5",
      lastmod: x.updated_at,
    })),
  ];
}

async function buildCounts(shopOpen: boolean): Promise<Record<SubSitemapKind, number>> {
  const [posts, categories, writers, dbPages, products, sellers] = await Promise.all([
    (await col.posts()).countDocuments({ status: "active", slug: { $gt: "" } }),
    (await col.categories()).countDocuments({ slug: { $gt: "" } }),
    (await col.writers()).countDocuments({ slug: { $gt: "" } }),
    (await col.pages()).countDocuments({ status: "publish", slug: { $gt: "", $nin: [...RESERVED_PAGE_SLUGS] } }),
    shopOpen ? (await col.products()).countDocuments({ status: "active", slug: { $gt: "" } }) : Promise.resolve(0),
    shopOpen ? (await col.sellers()).countDocuments({ status: "active", slug: { $gt: "" } }) : Promise.resolve(0),
  ]);
  return {
    posts,
    categories,
    writers,
    pages: 4 + dbPages,
    shop: shopOpen ? 1 + products + sellers : 0,
  };
}

function getCounts(shopOpen: boolean) {
  return unstable_cache(() => buildCounts(shopOpen), ["sitemap-counts-v1", String(shopOpen)], {
    tags: ["content", "shop", "sitemap"],
    revalidate: 3600,
  })();
}

function addChunks(out: IndexEntry[], base: string, kind: SubSitemapKind, dates: (Date | string | null | undefined)[]) {
  if (!dates.length) return;
  const totalPages = Math.ceil(dates.length / SITEMAP_CHUNK);
  for (let page = 1; page <= totalPages; page++) {
    const slice = dates.slice((page - 1) * SITEMAP_CHUNK, page * SITEMAP_CHUNK);
    out.push({ loc: subUrl(base, kind, page), lastmod: maxIso(slice) });
  }
}

async function buildIndexXml(base: string, shopOpen: boolean): Promise<string> {
  const [posts, cats, catDates, writers, writerDates, pages, shop] = await Promise.all([
    (await col.posts())
      .find({ status: "active", slug: { $gt: "" } }, { projection: { _id: 0, posted_date: 1, updated_at: 1 } })
      .sort({ _id: -1 })
      .toArray(),
    (await col.categories()).find({ slug: { $gt: "" } }, { projection: { _id: 1 } }).sort({ _id: -1 }).toArray(),
    getCategoryLastmods(),
    (await col.writers()).find({ slug: { $gt: "" } }, { projection: { _id: 1 } }).sort({ _id: -1 }).toArray(),
    getWriterLastmods(),
    fetchPages(),
    shopOpen ? fetchShop() : Promise.resolve([]),
  ]);

  const sitemaps: IndexEntry[] = [];
  addChunks(sitemaps, base, "posts", posts.map((p) => p.updated_at || p.posted_date));
  addChunks(sitemaps, base, "categories", cats.map((c) => catDates.get(c._id) || null));
  addChunks(sitemaps, base, "writers", writers.map((w) => writerDates.get(w._id) || null));
  addChunks(sitemaps, base, "pages", pages.map((p) => p.lastmod || null));
  if (shopOpen) addChunks(sitemaps, base, "shop", shop.map((p) => p.lastmod || null));

  return renderIndex(sitemaps);
}

async function buildSubXml(kind: SubSitemapKind, page: number, base: string, shopOpen: boolean): Promise<string> {
  const skip = (page - 1) * SITEMAP_CHUNK;
  let entries: UrlEntry[] = [];

  if (kind === "posts") {
    const rows = await (await col.posts())
      .find({ status: "active", slug: { $gt: "" } }, { projection: { slug: 1, posted_date: 1, updated_at: 1 } })
      .sort({ _id: -1 })
      .skip(skip)
      .limit(SITEMAP_CHUNK)
      .toArray();
    entries = rows.map((p) => ({
      loc: `/${p.slug}/`,
      changefreq: "weekly",
      priority: "0.8",
      lastmod: p.updated_at || p.posted_date,
    }));
  } else if (kind === "categories") {
    const rows = await (await col.categories())
      .find({ slug: { $gt: "" } }, { projection: { _id: 1, slug: 1 } })
      .sort({ _id: -1 })
      .skip(skip)
      .limit(SITEMAP_CHUNK)
      .toArray();
    const dates = rows.length ? await getCategoryLastmods(rows.map((r) => r._id)) : new Map<number, Date>();
    entries = rows.map((c) => ({
      loc: `/${c.slug}/`,
      changefreq: "weekly",
      priority: "0.7",
      lastmod: dates.get(c._id) || null,
    }));
  } else if (kind === "writers") {
    const rows = await (await col.writers())
      .find({ slug: { $gt: "" } }, { projection: { _id: 1, slug: 1 } })
      .sort({ _id: -1 })
      .skip(skip)
      .limit(SITEMAP_CHUNK)
      .toArray();
    const dates = rows.length ? await getWriterLastmods(rows.map((r) => r._id)) : new Map<number, Date>();
    entries = rows.map((w) => ({
      loc: `/${w.slug}/`,
      changefreq: "weekly",
      priority: "0.7",
      lastmod: dates.get(w._id) || null,
    }));
  } else if (kind === "pages") {
    entries = (await fetchPages()).slice(skip, skip + SITEMAP_CHUNK);
  } else if (kind === "shop" && shopOpen) {
    entries = (await fetchShop()).slice(skip, skip + SITEMAP_CHUNK);
  }

  return renderUrlset(base, entries);
}

const XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
};

export async function serveSitemapIndex(): Promise<Response> {
  const base = siteUrl();
  const s = await getSettings();
  const shopOpen = !s.shop_coming_soon && s.shop_indexable !== false;
  const xml = await unstable_cache(
    () => buildIndexXml(base, shopOpen),
    ["sitemap-index-v2", base, String(shopOpen)],
    { tags: ["content", "shop", "sitemap"], revalidate: 3600 },
  )();
  return new Response(xml, { headers: XML_HEADERS });
}

export async function serveSubSitemap(kind: SubSitemapKind, page = 1): Promise<Response> {
  if (!Number.isInteger(page) || page < 1) {
    return new Response("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  }
  const s = await getSettings();
  const shopOpen = !s.shop_coming_soon && s.shop_indexable !== false;
  if (kind === "shop" && !shopOpen) {
    return new Response("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  }
  const counts = await getCounts(shopOpen);
  const totalPages = Math.max(1, Math.ceil(counts[kind] / SITEMAP_CHUNK));
  if (page > totalPages) {
    return new Response("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  }
  const base = siteUrl();
  const tags = kind === "shop" ? ["content", "shop", "sitemap"] : ["content", "sitemap"];
  const xml = await unstable_cache(
    () => buildSubXml(kind, page, base, shopOpen),
    ["sitemap-sub-v2", kind, String(page), base, String(shopOpen)],
    { tags, revalidate: 3600 },
  )();
  return new Response(xml, { headers: XML_HEADERS });
}
