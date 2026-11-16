import Link from "next/link";
import { col } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { ShopNav } from "@/components/shop/ShopUI";
import { formatDate } from "@/lib/utils";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "Order Status" }, robots: "noindex, nofollow" };

const STEPS = ["Placed", "Packing", "Shipped", "Delivered"];
const stepOf = (o: Order) => ({ pending: 1, processing: 2, shipped: 3, completed: 4, cancelled: 0 })[o.status];
const money = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-PK")}`;

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ order_id?: string; token?: string }> }) {
  const sp = await searchParams;
  const id = parseInt(sp.order_id || "", 10);
  const orders = await col.orders();
  const first = id ? await orders.findOne({ _id: id }) : null;
  if (!first || !sp.token || first.tracking_token !== sp.token) {
    return (
      <>
        <ShopNav title="Order" back="/shop/" />
        <div className="shop-container" style={{ maxWidth: 600 }}>
          <div className="shop-empty-state">
            <h1 className="shop-empty-title">Order not found</h1>
            <p className="shop-empty-text">This tracking link is invalid or expired.</p>
            <Link href="/shop/" className="sp-submit" style={{ textDecoration: "none", margin: "0 auto", display: "inline-flex" }}>
              Back to shop
            </Link>
          </div>
        </div>
      </>
    );
  }
  // every parcel from the same checkout (one per seller)
  const all = first.checkout_id ? await orders.find({ checkout_id: first.checkout_id }).sort({ _id: 1 }).toArray() : [first];
  const sellerIds = all.map((o) => o.seller_id).filter((x): x is number => !!x);
  const [sellers, s] = await Promise.all([sellerIds.length ? (await col.sellers()).find({ _id: { $in: sellerIds } }, { projection: { store_name: 1, slug: 1, processing_days: 1 } }).toArray() : [], getSettings()]);
  const sm = new Map(sellers.map((x) => [x._id, x]));
  const total = all.reduce((a, o) => a + (o.status === "cancelled" ? 0 : o.total), 0);
  const fresh = Date.now() - new Date(first.created_at).getTime() < 30 * 60 * 1000;

  return (
    <>
      <ShopNav title={fresh ? "Order placed" : "Track order"} back="/shop/" />
      <div className="shop-container" style={{ maxWidth: 640 }}>
        <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
          {fresh ? (
            <div style={{ fontSize: "3rem", color: "var(--shop-accent)", marginBottom: 6 }}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
          ) : null}
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--shop-dark)", margin: "0 0 8px 0" }}>{fresh ? "Thank you! Your order is placed." : `Order #${first._id}`}</h1>
          <p style={{ fontSize: "0.88rem", color: "var(--shop-gray)", margin: 0 }}>
            Pay <b>{money(total)}</b> in cash when your books arrive.
            {all.length > 1 ? ` Your books come from ${all.length} sellers, so they arrive in ${all.length} parcels.` : ""}
          </p>
          <p style={{ fontSize: ".78rem", color: "#64748b", margin: "8px 0 0" }}>
            <i className="fa-solid fa-bookmark" style={{ color: "var(--shop-accent)" }}></i> Bookmark this page to track your order any time.
          </p>
        </div>

        {all.map((o) => {
          const step = stepOf(o);
          const seller = o.seller_id ? sm.get(o.seller_id) : null;
          return (
            <div className="cart-table-card" style={{ padding: 16, marginTop: 14 }} key={o._id}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                <b>Order #{o._id}</b>
                <span style={{ fontSize: ".8rem", color: "var(--shop-gray)" }}>
                  <i className="fa-solid fa-store"></i>{" "}
                  {seller ? (
                    <Link href={`/shop/seller/${seller.slug}/`} style={{ color: "inherit" }}>
                      {seller.store_name}
                    </Link>
                  ) : (
                    s.site_name
                  )}
                </span>
                <span style={{ marginLeft: "auto", fontWeight: 800 }}>{money(o.total)}</span>
              </div>
              {o.status === "cancelled" ? (
                <div className="shop-alert shop-alert-err">
                  <i className="fa-solid fa-ban"></i> This order was cancelled.
                  {o.history?.slice(-1)[0]?.note ? ` Reason: ${o.history.slice(-1)[0].note}` : ""}
                </div>
              ) : (
                <div className="shop-steps">
                  {STEPS.map((label, i) => (
                    <div key={label} className={step > i ? "on" : ""}>
                      <span>{step > i + 1 ? <i className="fa-solid fa-check"></i> : i + 1}</span>
                      <small>{label}</small>
                    </div>
                  ))}
                </div>
              )}
              {o.tracking_number ? (
                <div className="shop-alert" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
                  <i className="fa-solid fa-truck"></i> Shipped with <b>{o.courier || "courier"}</b> — tracking number <b style={{ userSelect: "all" }}>{o.tracking_number}</b>
                </div>
              ) : o.status === "pending" || o.status === "processing" ? (
                <p style={{ fontSize: ".78rem", color: "var(--shop-gray)", margin: "0 0 10px" }}>Usually ships within {seller?.processing_days || 2} days.</p>
              ) : null}
              {o.items.map((it, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: ".85rem", marginBottom: 6 }}>
                  <span>
                    {it.slug ? (
                      <Link href={`/shop/${it.slug}/`} style={{ color: "inherit" }}>
                        {it.title}
                      </Link>
                    ) : (
                      it.title
                    )}{" "}
                    <strong>×{it.quantity}</strong>
                  </span>
                  <span style={{ fontWeight: 700 }}>{money(it.price * it.quantity)}</span>
                </div>
              ))}
              <div className="cart-summary-row">
                <span>Shipping</span>
                <span>{o.shipping ? money(o.shipping) : "Free"}</span>
              </div>
              <p style={{ fontSize: ".75rem", color: "#64748b", margin: "6px 0 0" }}>
                {formatDate(o.created_at)} · {o.name} · {o.city}
              </p>
            </div>
          );
        })}

        <Link href="/shop/" className="cart-btn-checkout" style={{ textDecoration: "none", margin: "20px auto 0", maxWidth: 240 }}>
          <i className="fa-solid fa-store"></i> Continue shopping
        </Link>
      </div>
    </>
  );
}
