import Link from "next/link";
import type { Metadata } from "next";
import { getSettings, siteUrl } from "@/lib/settings";
import { listProducts, type ShopSort } from "@/lib/shop";
import { featureOpen } from "@/lib/comingSoon";
import { buildMeta, breadcrumb } from "@/lib/seo";
import { FloatingCart, ShopNav, ShopSearch } from "@/components/shop/ShopUI";
import ProductGrid, { Pager } from "@/components/shop/ProductGrid";
import { Banners } from "@/components/site/HomeClient";
import ComingSoon from "@/components/site/ComingSoon";
import PreviewCookie from "@/components/site/PreviewCookie";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

type SP = { search?: string; preview?: string; sort?: string; page?: string; stock?: string; lang?: string };

const SORTS: { k: ShopSort; l: string }[] = [
  { k: "new", l: "Newest" },
  { k: "popular", l: "Best selling" },
  { k: "sale", l: "On sale" },
  { k: "price_asc", l: "Price: low to high" },
  { k: "price_desc", l: "Price: high to low" },
];

function parse(sp: SP) {
  return {
    q: (sp.search || "").trim().slice(0, 100),
    sort: (SORTS.find((x) => x.k === sp.sort)?.k || "new") as ShopSort,
    page: Math.max(1, parseInt(sp.page || "1", 10) || 1),
    inStock: sp.stock === "1",
    lang: ["Urdu", "English", "Roman Urdu"].includes(sp.lang || "") ? sp.lang : undefined,
  };
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const [s, sp] = await Promise.all([getSettings(), searchParams]);
  const f = parse(sp);
  const filtered = f.q || f.sort !== "new" || f.inStock || f.lang;
  const indexable = !s.shop_coming_soon && s.shop_indexable !== false && !filtered;
  const title = `${s.shop_title || "Bookstore"} — Buy Printed Urdu Novels${f.page > 1 ? ` (Page ${f.page})` : ""} ${s.seo_title_sep || "|"} ${s.site_name}`;
  return buildMeta(s, siteUrl(), {
    title,
    description: s.shop_description || `Order printed Urdu novels from ${s.site_name}. Cash on delivery across Pakistan.`,
    path: f.page > 1 && !filtered ? `/shop/?page=${f.page}` : "/shop/",
    robots: indexable ? "index, follow" : "noindex, follow",
  });
}

export default async function ShopIndex({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const s = await getSettings();
  if (!(await featureOpen("shop", sp.preview))) return <ComingSoon title={s.shop_title || "Bookstore"} headline="Coming soon" subtitle="Printed copies of your favourite novels will be available here soon." siteName={s.site_name} />;
  const f = parse(sp);
  const { items, total, page, pages } = await listProducts({ ...f });
  const base = siteUrl();
  const link = (over: Partial<Record<keyof SP, string | undefined>>) => {
    const p = new URLSearchParams();
    const all = { search: f.q || undefined, sort: f.sort !== "new" ? f.sort : undefined, stock: f.inStock ? "1" : undefined, lang: f.lang, ...over };
    for (const [k, v] of Object.entries(all)) if (v) p.set(k, String(v));
    const qs = p.toString();
    return `/shop/${qs ? `?${qs}` : ""}`;
  };
  return (
    <>
      {sp.preview ? <PreviewCookie feature="shop" token={sp.preview} /> : null}
      <JsonLd data={breadcrumb(base, [{ name: s.shop_title || "Bookstore", path: "/shop/" }])} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", itemListElement: items.slice(0, 30).map((p, i) => ({ "@type": "ListItem", position: (page - 1) * 24 + i + 1, url: `${base}/shop/${p.slug}/`, name: p.title })) }} />
      <ShopNav title={s.shop_title || "Bookstore"} back="/" right="cart" />
      <div className="shop-container">
        {page === 1 && !f.q ? <Banners mobile={s.banner_mobile || []} desktop={s.banner_desktop || []} /> : null}
        <ShopSearch value={f.q} />
        <div className="shop-toolbar">
          <div className="shop-chips">
            {SORTS.map((o) => (
              <Link key={o.k} href={link({ sort: o.k === "new" ? undefined : o.k, page: undefined })} className={f.sort === o.k ? "on" : ""} rel="nofollow">
                {o.l}
              </Link>
            ))}
            <Link href={link({ stock: f.inStock ? undefined : "1", page: undefined })} className={f.inStock ? "on" : ""} rel="nofollow">
              <i className="fa-solid fa-box"></i> In stock
            </Link>
            {["Urdu", "English"].map((l) => (
              <Link key={l} href={link({ lang: f.lang === l ? undefined : l, page: undefined })} className={f.lang === l ? "on" : ""} rel="nofollow">
                {l}
              </Link>
            ))}
          </div>
        </div>
        <h1 className="shop-section-title">
          <i className="fa-solid fa-book"></i> {f.q ? `Results for “${f.q}”` : SORTS.find((x) => x.k === f.sort)?.l === "Newest" ? "Latest arrivals" : SORTS.find((x) => x.k === f.sort)?.l}
          <small style={{ marginLeft: "auto", fontWeight: 600, color: "var(--shop-gray)", fontSize: ".8rem" }}>{total.toLocaleString()} {total === 1 ? "book" : "books"}</small>
        </h1>
        {items.length ? (
          <>
            <ProductGrid items={items} />
            <Pager page={page} pages={pages} href={(n) => link({ page: n > 1 ? String(n) : undefined })} />
          </>
        ) : (
          <div className="shop-empty-state">
            <div className="shop-empty-icon">
              <i className="fa-solid fa-book-open"></i>
            </div>
            <h2 className="shop-empty-title">No books found</h2>
            <p className="shop-empty-text">{f.q ? "We couldn't find any books matching your search. Try other words." : "New printed books are coming soon. Check back later!"}</p>
            <Link href="/shop/" className="sp-submit" style={{ textDecoration: "none", margin: "0 auto", display: "inline-flex" }}>
              View all books
            </Link>
          </div>
        )}
        {s.sellers_enabled !== false ? (
          <div className="shop-sell-cta">
            <div>
              <b>Are you a writer or publisher?</b>
              <span>Sell your printed books here. 0% commission.</span>
            </div>
            <a href="/seller/register/" className="sp-submit" style={{ textDecoration: "none" }}>
              Start selling
            </a>
          </div>
        ) : null}
      </div>
      <FloatingCart />
    </>
  );
}
