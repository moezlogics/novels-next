import Link from "next/link";
import { thumbUrl } from "@/lib/utils";
import type { ProductView } from "@/lib/shop";
import { AddToCartButton } from "./ShopUI";

export const rs = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-PK")}`;

export function Stars({ value, count }: { value: number; count?: number }) {
  if (!value) return null;
  return (
    <span className="shop-stars" title={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={`fa-${value >= i - 0.25 ? "solid" : "regular"} fa-star`}></i>
      ))}
      {count ? <small>({count})</small> : null}
    </span>
  );
}

export default function ProductGrid({ items, showSeller = true }: { items: ProductView[]; showSeller?: boolean }) {
  return (
    <div className="shop-grid">
      {items.map((p, i) => (
        <div className="shop-card" key={p.id}>
          {p.discount ? <div className="shop-card-badge">-{p.discount}%</div> : null}
          {p.stock <= 0 ? <div className="shop-card-badge" style={{ left: "auto", right: 8, background: "#475569" }}>Sold out</div> : null}
          <Link href={`/shop/${p.slug}/`} className="shop-card-image-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image ? thumbUrl(p.image, 400) : "/images/kitab1-1.png"} className="shop-card-image" alt={p.title} loading={i < 4 ? "eager" : "lazy"} decoding="async" />
          </Link>
          <div className="shop-card-body">
            <Link href={`/shop/${p.slug}/`} className="shop-card-title">
              {p.title}
            </Link>
            {p.author ? <div className="shop-card-author">{p.author}</div> : null}
            {showSeller && p.seller ? (
              <div className="shop-card-seller">
                <i className="fa-solid fa-store"></i> {p.seller.name}
                {p.seller.verified ? <i className="fa-solid fa-circle-check" style={{ color: "#0e7490" }} title="Verified seller"></i> : null}
              </div>
            ) : null}
            <Stars value={p.rating_avg} count={p.rating_count} />
            <div className="shop-card-price-row">
              <span className="shop-card-price">{rs(p.effective)}</span>
              {p.sale_price !== null ? <span className="shop-card-old-price">{rs(p.price)}</span> : null}
            </div>
            <AddToCartButton id={p.id} stock={p.stock} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const nums = [...new Set([1, page - 1, page, page + 1, pages].filter((n) => n >= 1 && n <= pages))].sort((a, b) => a - b);
  return (
    <nav className="shop-pager" aria-label="Pages">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev">
          ‹ Prev
        </Link>
      ) : null}
      {nums.map((n, i) => (
        <span key={n} style={{ display: "contents" }}>
          {i > 0 && n - nums[i - 1] > 1 ? <span className="gap">…</span> : null}
          {n === page ? <b aria-current="page">{n}</b> : <Link href={href(n)}>{n}</Link>}
        </span>
      ))}
      {page < pages ? (
        <Link href={href(page + 1)} rel="next">
          Next ›
        </Link>
      ) : null}
    </nav>
  );
}
