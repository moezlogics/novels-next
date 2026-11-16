"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getGuestOrders, type GuestOrder } from "@/lib/readerStore";

const badge = (s: string) => (/delivered|completed/.test(s) ? "acct-badge-delivered" : /processing|shipped|dispatched/.test(s) ? "acct-badge-processing" : "acct-badge-pending");

export default function GuestOrders({ exclude, hasMember }: { exclude: number[]; hasMember: boolean }) {
  const [orders, setOrders] = useState<GuestOrder[] | null>(null);
  useEffect(() => setOrders(getGuestOrders().filter((o) => o?.id && !exclude.includes(+o.id))), [exclude]);
  if (!orders) return null;
  if (!orders.length && !hasMember)
    return (
      <div className="acct-empty" style={{ display: "flex", padding: "32px 0" }}>
        <i className="fa-solid fa-box-open"></i>
        <h2>No orders yet</h2>
        <p>Place an order from the bookstore and it will show up here.</p>
        <Link href="/shop/" className="acct-btn acct-btn-primary acct-btn-sm" style={{ marginTop: 12 }}>
          Browse Bookstore
        </Link>
      </div>
    );
  if (!orders.length) return null;
  return (
    <div className="acct-card">
      {orders.map((o) => (
        <Link key={o.id} href={`/shop/success/?order_id=${o.id}${o.tracking_token ? `&token=${o.tracking_token}` : ""}`} className="acct-order acct-order-link">
          <div>
            <div className="acct-order-id">Order #{o.id}</div>
            <div className="acct-order-meta">
              {o.created_at ? new Date(o.created_at).toLocaleDateString() : ""} · <span className={`acct-badge ${badge(String(o.status || "pending"))}`}>{o.status || "pending"}</span>
              {o.items?.length ? (
                <>
                  <br />
                  <span style={{ fontSize: ".72rem", color: "#64748b" }}>{o.items.map((i) => `${i.title} ×${i.quantity || 1}`).join(", ")}</span>
                </>
              ) : null}
            </div>
          </div>
          <div className="acct-order-total">Rs. {Number(o.total || 0).toLocaleString()}</div>
        </Link>
      ))}
    </div>
  );
}
