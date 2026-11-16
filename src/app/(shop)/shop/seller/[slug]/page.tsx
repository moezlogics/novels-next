import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fillTitle, getSettings, siteUrl } from "@/lib/settings";
import { getStore, listProducts } from "@/lib/shop";
import { featureOpen } from "@/lib/comingSoon";
import { breadcrumb, buildMeta, ogImage } from "@/lib/seo";
import { excerpt, mediaUrl, thumbUrl } from "@/lib/utils";
import { FloatingCart, ShopNav } from "@/components/shop/ShopUI";
import ProductGrid, { Pager } from "@/components/shop/ProductGrid";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, sp, s] = await Promise.all([params, searchParams, getSettings()]);
  const st = await getStore(slug);
  if (!st) return { title: "Store not found", robots: "noindex" };
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const base = siteUrl();
  return buildMeta(s, base, {
    title: fillTitle(s, s.seo_tpl_store, { title: st.name }) + (page > 1 ? ` (Page ${page})` : ""),
    description: excerpt(st.bio, 155) || `Buy printed books from ${st.name}${st.city ? ` in ${st.city}` : ""} on ${s.site_name}. ${st.books} books, cash on delivery.`,
    path: `/shop/seller/${st.slug}/${page > 1 ? `?page=${page}` : ""}`,
    image: st.logo ? ogImage(st.logo, base) : undefined,
    robots: !s.shop_coming_soon && s.shop_indexable !== false ? "index, follow" : "noindex, nofollow",
  });
}

export default async function StorePage({ params, searchParams }: Props) {
  const [{ slug }, sp, s] = await Promise.all([params, searchParams, getSettings()]);
  if (!(await featureOpen("shop"))) notFound();
  const st = await getStore(slug);
  if (!st) notFound();
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const { items, pages, total } = await listProducts({ seller: st.id, page, sort: "new" });
  const base = siteUrl();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Store",
          "@id": `${base}/shop/seller/${st.slug}/#store`,
          name: st.name,
          url: `${base}/shop/seller/${st.slug}/`,
          description: excerpt(st.bio, 300) || undefined,
          image: st.logo ? ogImage(st.logo, base) : undefined,
          ...(st.city ? { address: { "@type": "PostalAddress", addressLocality: st.city, addressCountry: "PK" } } : {}),
          paymentAccepted: "Cash on delivery",
          currenciesAccepted: "PKR",
        }}
      />
      <JsonLd data={breadcrumb(base, [{ name: s.shop_title || "Bookstore", path: "/shop/" }, { name: st.name, path: `/shop/seller/${st.slug}/` }])} />
      <ShopNav title={st.name} back="/shop/" right="cart" />
      <div className="shop-container">
        <div className="shop-store-head" style={st.banner ? { backgroundImage: `url(${mediaUrl(st.banner)})` } : undefined}>
          <div className="shop-store-id">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {st.logo ? <img src={thumbUrl(st.logo, 200)} alt={st.name} /> : <span className="av">{st.name.charAt(0)}</span>}
            <div>
              <h1>
                {st.name} {st.verified ? <i className="fa-solid fa-circle-check" style={{ color: "#0e7490", fontSize: "1rem" }} title="Verified seller"></i> : null}
              </h1>
              <div className="shop-store-meta">
                {st.city ? (
                  <span>
                    <i className="fa-solid fa-location-dot"></i> {st.city}
                  </span>
                ) : null}
                <span>
                  <i className="fa-solid fa-book"></i> {st.books} {st.books === 1 ? "book" : "books"}
                </span>
                {st.delivered ? (
                  <span>
                    <i className="fa-solid fa-truck"></i> {st.delivered} orders delivered
                  </span>
                ) : null}
                <span>
                  <i className="fa-solid fa-calendar"></i> Since {new Date(st.since).getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </div>
        {st.bio ? (
          <p className="shop-store-bio" style={{ whiteSpace: "pre-line" }}>
            {st.bio}
          </p>
        ) : null}
        <ul className="shop-perks" style={{ marginBottom: 18 }}>
          <li>
            <i className="fa-solid fa-money-bill-wave"></i> Cash on delivery
          </li>
          <li>
            <i className="fa-solid fa-truck"></i> {st.shipping_fee ? `Shipping Rs. ${st.shipping_fee}` : "Free shipping"}
            {st.shipping_fee && st.free_shipping_over ? ` · free over Rs. ${st.free_shipping_over.toLocaleString()}` : ""} · ships within {st.processing_days} days
          </li>
          {st.return_policy ? (
            <li>
              <i className="fa-solid fa-rotate-left"></i> {st.return_policy}
            </li>
          ) : null}
        </ul>
        <h2 className="shop-section-title">
          <i className="fa-solid fa-book"></i> Books ({total})
        </h2>
        {items.length ? (
          <>
            <ProductGrid items={items} showSeller={false} />
            <Pager page={page} pages={pages} href={(n) => `/shop/seller/${st.slug}/${n > 1 ? `?page=${n}` : ""}`} />
          </>
        ) : (
          <p style={{ color: "var(--shop-gray)" }}>No books for sale right now.</p>
        )}
      </div>
      <FloatingCart />
    </>
  );
}
