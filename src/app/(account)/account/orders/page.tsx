import Link from "next/link";
import { col } from "@/lib/db";
import { getMember } from "@/lib/auth";
import AcctTopNav from "@/components/account/TopNav";
import GuestOrders from "@/components/account/GuestOrders";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "My Orders" }, robots: "noindex, nofollow", alternates: { canonical: "/account/orders/" } };

export default async function OrdersPage() {
  const m = await getMember();
  const orders = m ? await (await col.orders()).find({ member_id: m._id }).sort({ _id: -1 }).limit(100).toArray() : [];
  return (
    <>
      <AcctTopNav title="My Orders" back="/account/" />
      <div className="acct-app-shell">
        <div className="acct-page-head">
          <h1 className="acct-title">
            <i className="fa-solid fa-box"></i> My Orders
          </h1>
          <p className="acct-sub">Your bookstore purchases and guest orders saved on this device.</p>
        </div>
        {orders.length ? (
          <div className="acct-card">
            {orders.map((o) => (
              <Link key={o._id} href={`/shop/success/?order_id=${o._id}&token=${o.tracking_token}`} className="acct-order acct-order-link" rel="nofollow">
                <div>
                  <div className="acct-order-id">Order #{o._id}</div>
                  <div className="acct-order-meta">
                    {formatDate(o.created_at, false)} · <span className={`acct-badge acct-badge-${o.status}`}>{o.status}</span>
                  </div>
                </div>
                <div className="acct-order-total">Rs. {Math.round(o.total).toLocaleString()}</div>
              </Link>
            ))}
          </div>
        ) : null}
        <GuestOrders exclude={orders.map((o) => o._id)} hasMember={orders.length > 0} />
      </div>
    </>
  );
}
