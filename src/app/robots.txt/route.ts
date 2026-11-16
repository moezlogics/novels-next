import { getSettings, siteUrl } from "@/lib/settings";

export const revalidate = 3600;

export async function GET() {
  const base = siteUrl();
  const s = await getSettings();
  const shopOpen = !s.shop_coming_soon && s.shop_indexable !== false;
  const lines = [
    "User-agent: *",
    "Allow: /",
    "",
    "Disallow: /newlogin/",
    "Disallow: /seller/",
    "Disallow: /api/",
    "Disallow: /account/",
    "Disallow: /login/",
    "Disallow: /register/",
    shopOpen ? "Disallow: /shop/cart/\nDisallow: /shop/checkout/\nDisallow: /shop/success/" : "Disallow: /shop/",
    "Disallow: /community/post/",
    "Disallow: /community/u/",
    s.noindex_search === false ? "" : "Disallow: /*?search=",
    (s.robots_extra || "").trim(),
    "",
    `Sitemap: ${base}/sitemap.xml`,
    `LLMs: ${base}/llms.txt`,
    "",
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "");
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex", "Cache-Control": "public, max-age=3600" } });
}
