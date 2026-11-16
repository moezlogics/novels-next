import { col } from "@/lib/db";
import { getSettings, siteUrl } from "@/lib/settings";

export const revalidate = 3600;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET() {
  const base = siteUrl();
  const urls: string[] = [];
  const add = (loc: string, freq: string, pri: string, lastmod?: Date) =>
    urls.push(`  <url>\n    <loc>${esc(base + loc)}</loc>\n${lastmod ? `    <lastmod>${new Date(lastmod).toISOString()}</lastmod>\n` : ""}    <changefreq>${freq}</changefreq>\n    <priority>${pri}</priority>\n  </url>`);

  add("/", "daily", "1.0");
  add("/categories/", "weekly", "0.8");
  add("/about/", "monthly", "0.5");
  add("/contact/", "monthly", "0.5");

  const [cats, writers, posts, pages] = await Promise.all([
    (await col.categories()).find({ slug: { $gt: "" } }, { projection: { slug: 1 } }).sort({ _id: -1 }).toArray(),
    (await col.writers()).find({ slug: { $gt: "" } }, { projection: { slug: 1 } }).sort({ _id: -1 }).toArray(),
    (await col.posts()).find({ status: "active" }, { projection: { slug: 1, posted_date: 1, updated_at: 1 } }).sort({ _id: -1 }).toArray(),
    (await col.pages()).find({ status: "publish", slug: { $gt: "" } }, { projection: { slug: 1, updated_at: 1 } }).sort({ _id: -1 }).toArray(),
  ]);
  cats.forEach((c) => add(`/${c.slug}/`, "weekly", "0.7"));
  writers.forEach((w) => add(`/${w.slug}/`, "weekly", "0.7"));
  posts.forEach((p) => add(`/${p.slug}/`, "weekly", "0.8", p.updated_at || p.posted_date));
  pages.forEach((p) => add(`/${p.slug}/`, "monthly", "0.6", p.updated_at));

  // Bookstore: products + seller stores (only when the shop is open and indexable)
  const s = await getSettings();
  if (!s.shop_coming_soon && s.shop_indexable !== false) {
    add("/shop/", "daily", "0.7");
    const [products, sellers] = await Promise.all([
      (await col.products()).find({ status: "active" }, { projection: { slug: 1, updated_at: 1, created_at: 1 } }).sort({ _id: -1 }).limit(20000).toArray(),
      (await col.sellers()).find({ status: "active" }, { projection: { slug: 1, updated_at: 1 } }).limit(5000).toArray(),
    ]);
    products.forEach((p) => add(`/shop/${p.slug}/`, "weekly", "0.6", p.updated_at || p.created_at));
    sellers.forEach((x) => add(`/shop/seller/${x.slug}/`, "weekly", "0.5", x.updated_at));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
