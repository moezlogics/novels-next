import Link from "next/link";
import { requireSeller } from "@/lib/sellerAuth";
import { getSettings } from "@/lib/settings";
import { sellerStats } from "@/lib/marketplace";
import { thumbUrl } from "@/lib/utils";
import Flash, { money } from "@/components/seller/Flash";

export const metadata = { title: "Dashboard" };

export default async function SellerHome({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const [seller, sp, s] = await Promise.all([requireSeller({ allowInactive: true }), searchParams, getSettings()]);
  if (seller.status !== "active")
    return (
      <>
        <Flash {...sp} />
        <div className="sl-card" style={{ textAlign: "center", padding: 32 }}>
          <i className={`fa-solid ${seller.status === "pending" ? "fa-hourglass-half" : "fa-ban"}`} style={{ fontSize: "2.2rem", color: seller.status === "pending" ? "#b45309" : "#dc2626" }}></i>
          <h1 className="sl-h1" style={{ justifyContent: "center" }}>
            {seller.status === "pending" ? "Your account is waiting for approval" : "Your seller account is suspended"}
          </h1>
          <p className="sl-muted">
            {seller.status === "pending"
              ? "An admin checks new seller accounts, usually within a day. Meanwhile you can set up your store profile."
              : "You cannot sell right now. Please contact the website admin."}
          </p>
          {seller.status === "pending" ? (
            <Link className="sl-btn" href="/seller/store/">
              <i className="fa-solid fa-store"></i> Set up my store
            </Link>
          ) : (
            <Link className="sl-btn ghost" href="/contact/">
              Contact the admin
            </Link>
          )}
        </div>
      </>
    );

  const st = await sellerStats(seller._id);
  const maxViews = Math.max(1, ...st.days.map((d) => d.views));
  const maxOrders = Math.max(1, ...st.days.map((d) => d.orders));
  const views30 = st.days.reduce((a, d) => a + d.views, 0);
  const orders30 = st.days.reduce((a, d) => a + d.orders, 0);
  const rev30 = st.days.reduce((a, d) => a + d.revenue, 0);
  const reviewFirst = s.seller_review_first ?? 3;
  const steps = [
    { label: "Set up your store", hint: "Logo, a short intro and your delivery charges.", href: "/seller/store/", done: !!(seller.logo || seller.bio) },
    { label: "Add your first book", hint: `Photo, title, price and stock. The first ${reviewFirst} books are checked by an admin.`, href: "/seller/products/new/", done: st.products.total > 0 },
    { label: "Your book goes live", hint: "After approval it appears in the shop and buyers can order.", href: "/seller/products/", done: st.products.active > 0 },
  ];

  return (
    <>
      <Flash {...sp} />
      <h1 className="sl-h1">
        Salam, {seller.name.split(" ")[0]} 👋<span className="sp" />
        <Link className="sl-btn" href="/seller/products/new/">
          <i className="fa-solid fa-plus"></i> Add a book
        </Link>
      </h1>

      {steps.some((x) => !x.done) ? (
        <div className="sl-card sl-start">
          <h2>Get started</h2>
          {steps.map((x, i) => (
            <Link key={x.label} href={x.href} className={x.done ? "done" : ""}>
              <span className="n">{x.done ? <i className="fa-solid fa-check"></i> : i + 1}</span>
              <span className="t">
                <b>{x.label}</b>
                <small>{x.hint}</small>
              </span>
              {x.done ? null : <i className="fa-solid fa-chevron-right"></i>}
            </Link>
          ))}
        </div>
      ) : null}

      {st.orders.pending ? (
        <div className="sl-alert warn">
          <b>
            {st.orders.pending} new order{st.orders.pending > 1 ? "s" : ""}
          </b>{" "}
          waiting for you. <Link href="/seller/orders/?status=pending">Pack and ship them →</Link>
        </div>
      ) : null}
      {st.products.pending ? <div className="sl-alert info">{st.products.pending} book(s) waiting for admin review.</div> : null}
      {st.products.rejected ? (
        <div className="sl-alert err">
          {st.products.rejected} book(s) need changes. <Link href="/seller/products/?status=rejected">See why →</Link>
        </div>
      ) : null}
      {st.products.outOfStock ? (
        <div className="sl-alert warn">
          {st.products.outOfStock} live book(s) are out of stock. <Link href="/seller/products/">Update stock →</Link>
        </div>
      ) : null}

      <div className="sl-grid sl-g4" style={{ marginBottom: 14 }}>
        <div className="sl-stat">
          <small>
            <i className="fa-solid fa-sack-dollar"></i>Earned (delivered)
          </small>
          <b>{money(st.revenue)}</b>
        </div>
        <div className="sl-stat">
          <small>
            <i className="fa-solid fa-truck-fast"></i>On the way
          </small>
          <b>{money(st.pendingRevenue)}</b>
        </div>
        <div className="sl-stat">
          <small>
            <i className="fa-solid fa-box"></i>Orders
          </small>
          <b>{st.orders.total}</b>
        </div>
        <div className="sl-stat">
          <small>
            <i className="fa-solid fa-book"></i>Copies sold
          </small>
          <b>{st.sold}</b>
        </div>
      </div>
      <details className="sl-more" style={{ marginBottom: 14 }}>
        <summary>More numbers</summary>
        <div className="sl-grid sl-g4">
          <div className="sl-stat">
            <small>
              <i className="fa-solid fa-eye"></i>Product views
            </small>
            <b>{st.views.toLocaleString()}</b>
          </div>
          <div className="sl-stat">
            <small>
              <i className="fa-solid fa-percent"></i>Views → orders
            </small>
            <b>{st.conversion}%</b>
          </div>
          <div className="sl-stat">
            <small>
              <i className="fa-solid fa-circle-check"></i>Live books
            </small>
            <b>
              {st.products.active}/{st.products.total}
            </b>
          </div>
          <div className="sl-stat">
            <small>
              <i className="fa-solid fa-circle-xmark"></i>Cancelled
            </small>
            <b>{st.orders.cancelled || 0}</b>
          </div>
        </div>
      </details>

      <div className="sl-grid sl-g2">
        <div className="sl-card">
          <h2>
            <i className="fa-solid fa-eye"></i> Views — last 30 days <span className="sl-muted sl-small">({views30.toLocaleString()})</span>
          </h2>
          <div className="sl-chart" aria-label="Views per day">
            {st.days.map((d) => (
              <span key={d.day} style={{ height: `${Math.max(2, (d.views / maxViews) * 100)}%` }} data-t={`${d.day}: ${d.views} views`} />
            ))}
          </div>
        </div>
        <div className="sl-card">
          <h2>
            <i className="fa-solid fa-box"></i> Orders — last 30 days{" "}
            <span className="sl-muted sl-small">
              ({orders30} · {money(rev30)})
            </span>
          </h2>
          <div className="sl-chart" aria-label="Orders per day">
            {st.days.map((d) => (
              <span key={d.day} style={{ height: `${Math.max(2, (d.orders / maxOrders) * 100)}%`, background: "linear-gradient(180deg,#059669,#6ee7b7)" }} data-t={`${d.day}: ${d.orders} orders · ${money(d.revenue)}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="sl-card">
        <h2>
          <i className="fa-solid fa-trophy"></i> Top books
        </h2>
        {st.top.length ? (
          <div className="sl-list">
            {st.top.map((p) => (
              <div className="sl-item" key={p._id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image ? thumbUrl(p.image, 200) : "/images/kitab1-1.png"} alt="" />
                <div className="bd">
                  <b>{p.title}</b>
                  <div className="meta">
                    <span>{p.sold || 0} sold</span>
                    <span>{(p.views || 0).toLocaleString()} views</span>
                    <span>{p.stock} in stock</span>
                  </div>
                </div>
                <Link className="sl-btn ghost sm" href={`/seller/products/${p._id}/`}>
                  Edit
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="sl-muted">No books yet.</p>
        )}
      </div>
    </>
  );
}
