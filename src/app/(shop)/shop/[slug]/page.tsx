import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fillTitle, getSettings, siteUrl } from "@/lib/settings";
import { getProduct, getRelated, getReviews } from "@/lib/shop";
import { featureOpen } from "@/lib/comingSoon";
import { breadcrumb, buildMeta, ogImage } from "@/lib/seo";
import { excerpt, thumbUrl, whatsappUrl } from "@/lib/utils";
import { ProductBuy, ProductGallery, ShopNav } from "@/components/shop/ShopUI";
import ProductGrid, { Stars, rs } from "@/components/shop/ProductGrid";
import { ReviewForm, ViewBeacon } from "@/components/shop/ProductExtras";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  const s = await getSettings();
  if (!p) return { title: "Not found", robots: "noindex" };
  const base = siteUrl();
  const title = p.meta_title || fillTitle(s, s.seo_tpl_product, { title: p.author ? `${p.title} by ${p.author}` : p.title });
  const desc = p.meta_description || excerpt(p.description, 155) || `Order ${p.title} printed copy. Cash on delivery across Pakistan.`;
  const meta = buildMeta(s, base, {
    title,
    description: desc,
    path: `/shop/${p.slug}/`,
    image: ogImage(p.image, base),
    robots: !s.shop_coming_soon && s.shop_indexable !== false ? "index, follow" : "noindex, nofollow",
  });
  return {
    ...meta,
    other: {
      ...(meta.other as Record<string, string>),
      "product:price:amount": p.effective.toFixed(0),
      "product:price:currency": "PKR",
      "product:availability": p.stock > 0 ? "in stock" : "out of stock",
      "product:condition": p.condition === "used" ? "used" : "new",
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const slug = (await params).slug;
  const s = await getSettings();
  if (!(await featureOpen("shop"))) notFound();
  const p = await getProduct(slug);
  if (!p) notFound();
  const [related, reviews] = await Promise.all([getRelated(p.id, p.seller?.id ?? null, p.author), getReviews(p.id)]);
  const base = siteUrl();
  const wa = p.seller ? "" : whatsappUrl(s.contact_whatsapp);
  const waText = encodeURIComponent(`Hi, I want to order "${p.title}" (Rs. ${p.effective}). ${base}/shop/${p.slug}/`);
  const shipFee = p.seller ? p.seller.shipping_fee : (s.shipping_fee ?? 150);
  const freeOver = p.seller ? p.seller.free_shipping_over : (s.free_shipping_over ?? 0);
  const days = p.seller?.processing_days ?? 2;
  const policy = p.seller ? p.seller.return_policy : s.return_policy || "";
  const facts: [string, string][] = (
    [
      ["Writer", p.author],
      ["Language", p.language],
      ["Pages", p.pages_count ? String(p.pages_count) : ""],
      ["Binding", p.binding ? p.binding[0].toUpperCase() + p.binding.slice(1) : ""],
      ["Condition", p.condition === "used" ? "Used" : "New"],
      ["ISBN", p.isbn],
    ] as [string, string][]
  ).filter(([, v]) => v);

  return (
    <>
      <ViewBeacon id={p.id} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.title,
          image: [p.image, ...p.gallery].filter(Boolean).map((i) => ogImage(i, base)),
          description: excerpt(p.description, 300),
          sku: `KN-${p.id}`,
          ...(p.isbn ? { gtin13: p.isbn.replace(/\D/g, "").length === 13 ? p.isbn.replace(/\D/g, "") : undefined } : {}),
          brand: { "@type": "Brand", name: p.seller?.name || s.site_name },
          ...(p.author ? { author: { "@type": "Person", name: p.author } } : {}),
          ...(p.rating_count ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating_avg, reviewCount: p.rating_count, bestRating: 5, worstRating: 1 } } : {}),
          ...(reviews.length
            ? { review: reviews.slice(0, 5).map((r) => ({ "@type": "Review", author: { "@type": "Person", name: r.name }, datePublished: r.date.slice(0, 10), reviewBody: r.text, reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 } })) }
            : {}),
          offers: {
            "@type": "Offer",
            url: `${base}/shop/${p.slug}/`,
            priceCurrency: "PKR",
            price: p.effective.toFixed(0),
            availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            itemCondition: p.condition === "used" ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
            seller: { "@type": "Organization", name: p.seller?.name || s.site_name },
            shippingDetails: {
              "@type": "OfferShippingDetails",
              shippingRate: { "@type": "MonetaryAmount", value: shipFee, currency: "PKR" },
              shippingDestination: { "@type": "DefinedRegion", addressCountry: "PK" },
              deliveryTime: { "@type": "ShippingDeliveryTime", handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: days, unitCode: "DAY" }, transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 5, unitCode: "DAY" } },
            },
          },
        }}
      />
      <JsonLd data={breadcrumb(base, [{ name: s.shop_title || "Bookstore", path: "/shop/" }, ...(p.seller ? [{ name: p.seller.name, path: `/shop/seller/${p.seller.slug}/` }] : []), { name: p.title, path: `/shop/${p.slug}/` }])} />
      <ShopNav title="Book details" back="/shop/" right="cart" />
      <div className="shop-container">
        <div className="sp-details-container">
          <ProductGallery title={p.title} image={p.image} gallery={p.gallery} video={p.video_url} />
          <div className="sp-details-info">
            <h1 className="sp-details-title">{p.title}</h1>
            {p.author ? <div className="shop-by">by {p.author}</div> : null}
            {p.rating_count ? (
              <a href="#reviews" className="shop-by" style={{ textDecoration: "none" }}>
                <Stars value={p.rating_avg} count={p.rating_count} />
              </a>
            ) : null}
            {p.stock > 0 ? (
              <span className="sp-details-stock-badge sp-details-stock-in">
                <i className="fa-solid fa-circle-check"></i> {p.stock <= 5 ? `Only ${p.stock} left` : "In stock"}
              </span>
            ) : (
              <span className="sp-details-stock-badge sp-details-stock-out">
                <i className="fa-solid fa-circle-xmark"></i> Out of stock
              </span>
            )}
            <div className="sp-details-price-box">
              <span className="sp-details-price">{rs(p.effective)}</span>
              {p.sale_price !== null ? (
                <>
                  <span className="sp-details-old-price">{rs(p.price)}</span>
                  <span style={{ marginLeft: "auto", background: "var(--shop-danger)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>-{p.discount}% OFF</span>
                </>
              ) : null}
            </div>
            <div className="sp-details-actions" style={{ marginBottom: 12 }}>
              <ProductBuy id={p.id} stock={p.stock} />
              {wa ? (
                <a href={`${wa}?text=${waText}`} target="_blank" rel="noopener noreferrer" className="sp-details-btn-buy" style={{ background: "#25d366", color: "#fff", textDecoration: "none" }}>
                  <i className="fa-brands fa-whatsapp"></i> Order on WhatsApp
                </a>
              ) : null}
            </div>
            <ul className="shop-perks">
              <li>
                <i className="fa-solid fa-money-bill-wave"></i> Cash on delivery all over Pakistan
              </li>
              <li>
                <i className="fa-solid fa-truck"></i> {shipFee ? `Shipping ${rs(shipFee)}` : "Free shipping"}
                {shipFee && freeOver ? ` · free over ${rs(freeOver)}` : ""} · ships within {days} day{days > 1 ? "s" : ""}
              </li>
              {policy ? (
                <li>
                  <i className="fa-solid fa-rotate-left"></i> {policy}
                </li>
              ) : null}
            </ul>
            {p.seller ? (
              <Link href={`/shop/seller/${p.seller.slug}/`} className="shop-seller-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.seller.logo ? <img src={thumbUrl(p.seller.logo, 200)} alt="" /> : <span className="av">{p.seller.name.charAt(0)}</span>}
                <span>
                  <small>Sold by</small>
                  <b>
                    {p.seller.name} {p.seller.verified ? <i className="fa-solid fa-circle-check" style={{ color: "#0e7490" }} title="Verified seller"></i> : null}
                  </b>
                  {p.seller.city ? <small>Ships from {p.seller.city}</small> : null}
                </span>
                <i className="fa-solid fa-chevron-right" style={{ marginLeft: "auto" }}></i>
              </Link>
            ) : null}
            {p.novel_slug ? (
              <Link href={`/${p.novel_slug}/`} style={{ fontSize: ".85rem", fontWeight: 700, color: "var(--shop-secondary)", textDecoration: "none" }}>
                <i className="fa-solid fa-book-open"></i> Read the novel online free →
              </Link>
            ) : null}
            {facts.length ? (
              <table className="shop-facts">
                <tbody>
                  {facts.map(([k, v]) => (
                    <tr key={k}>
                      <th>{k}</th>
                      <td>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {p.description ? (
              p.plain ? (
                <div className="sp-details-desc" style={{ marginTop: 16, whiteSpace: "pre-line" }}>
                  {p.description}
                </div>
              ) : (
                <div className="sp-details-desc sp-content" style={{ marginTop: 16 }} dangerouslySetInnerHTML={{ __html: p.description }} />
              )
            ) : null}
          </div>
        </div>

        <section id="reviews" className="shop-reviews">
          <h2 className="shop-section-title">
            <i className="fa-solid fa-star"></i> Reader reviews {p.rating_count ? <Stars value={p.rating_avg} count={p.rating_count} /> : null}
          </h2>
          {reviews.length ? (
            <ul>
              {reviews.map((r) => (
                <li key={r.id}>
                  <div>
                    <b>{r.name}</b> <Stars value={r.rating} /> <small>{new Date(r.date).toLocaleDateString("en-PK", { dateStyle: "medium" })}</small>
                  </div>
                  <p>{r.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "var(--shop-gray)", fontSize: ".88rem" }}>No reviews yet. Be the first to review this book.</p>
          )}
          <ReviewForm productId={p.id} />
        </section>

        {related.length ? (
          <section style={{ marginTop: 28 }}>
            <h2 className="shop-section-title">
              <i className="fa-solid fa-book-open"></i> {p.seller ? `More from ${p.seller.name} & similar books` : "You may also like"}
            </h2>
            <ProductGrid items={related} />
          </section>
        ) : null}
      </div>
    </>
  );
}
