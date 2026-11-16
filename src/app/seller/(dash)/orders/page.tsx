import Link from "next/link";
import { col } from "@/lib/db";
import { requireSeller } from "@/lib/sellerAuth";
import { STATUS_LABEL } from "@/lib/marketplace";
import { sellerOrderStatus } from "../../actions";
import Flash, { money } from "@/components/seller/Flash";
import type { OrderStatus } from "@/lib/types";

export const metadata = { title: "Orders" };

const TONE: Record<OrderStatus, string> = { pending: "warn", processing: "info", shipped: "info", completed: "ok", cancelled: "bad" };
const STATUSES: OrderStatus[] = ["pending", "processing", "shipped", "completed", "cancelled"];

export default async function SellerOrders({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; status?: string; open?: string }> }) {
  const [seller, sp] = await Promise.all([requireSeller(), searchParams]);
  const status = STATUSES.find((x) => x === sp.status);
  const orders = await col.orders();
  const [rows, counts] = await Promise.all([
    orders.find({ seller_id: seller._id, ...(status ? { status } : {}) }).sort({ _id: -1 }).limit(200).toArray(),
    orders.aggregate<{ _id: string; n: number }>([{ $match: { seller_id: seller._id } }, { $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
  ]);
  const c = Object.fromEntries(counts.map((x) => [x._id, x.n]));
  const open = parseInt(sp.open || "", 10);
  return (
    <>
      <Flash ok={sp.ok} err={sp.err} />
      <h1 className="sl-h1">Orders</h1>
      <div className="sl-alert info sl-small">
        Buyers pay <b>cash on delivery</b> to your courier. Pack the order, book it with any courier (TCS, Leopards, M&amp;P, Trax, Pakistan Post…), then mark it <b>Shipped</b> with the tracking number. The buyer sees every step.
      </div>
      <div className="sl-tabs">
        <Link href="/seller/orders/" className={!status ? "on" : ""}>
          All
        </Link>
        {STATUSES.map((k) => (
          <Link key={k} href={`/seller/orders/?status=${k}`} className={status === k ? "on" : ""}>
            {STATUS_LABEL[k]} ({c[k] || 0})
          </Link>
        ))}
      </div>
      {rows.length ? (
        rows.map((o) => {
          const closed = o.status === "completed" || o.status === "cancelled";
          return (
            <details className="sl-order" key={o._id} open={open === o._id || (o.status === "pending" && rows.length < 6)}>
              <summary>
                <b>#{o._id}</b>
                <span className={`sl-pill ${TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                <span className="sl-muted sl-small">{new Date(o.created_at).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}</span>
                <span style={{ marginLeft: "auto", fontWeight: 800 }}>{money(o.total)}</span>
              </summary>
              <div className="body">
                <div className="sl-grid sl-g2" style={{ marginTop: 12 }}>
                  <div>
                    <div className="sl-small sl-muted">Ship to</div>
                    <b>{o.name}</b>
                    <div>{o.phone}</div>
                    <div className="sl-small">
                      {o.address}, {o.city}
                    </div>
                    {o.notes ? <div className="sl-small sl-muted">Note: {o.notes}</div> : null}
                  </div>
                  <div>
                    <table className="sl-table">
                      <tbody>
                        {o.items.map((it) => (
                          <tr key={it.product_id}>
                            <td>
                              {it.title} × {it.quantity}
                            </td>
                            <td style={{ textAlign: "right" }}>{money(it.price * it.quantity)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td className="sl-muted">Shipping</td>
                          <td style={{ textAlign: "right" }}>{money(o.shipping)}</td>
                        </tr>
                        <tr>
                          <td>
                            <b>Collect on delivery</b>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <b>{money(o.total)}</b>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {o.tracking_number ? (
                  <p className="sl-small">
                    <i className="fa-solid fa-truck"></i> {o.courier || "Courier"}: <b>{o.tracking_number}</b>
                  </p>
                ) : null}
                {!closed ? (
                  <form action={sellerOrderStatus} className="sl-card" style={{ background: "#f8fafc", marginTop: 12, marginBottom: 0 }}>
                    <input type="hidden" name="id" value={o._id} />
                    {o.status !== "shipped" ? (
                      <div className="sl-grid sl-g2">
                        <div className="sl-field">
                          <label>Courier</label>
                          <input name="courier" defaultValue={o.courier || ""} placeholder="TCS / Leopards / M&P…" />
                        </div>
                        <div className="sl-field">
                          <label>Tracking number</label>
                          <input name="tracking_number" defaultValue={o.tracking_number || ""} placeholder="Needed when you ship" />
                        </div>
                      </div>
                    ) : null}
                    <div className="sl-steps">
                      {o.status === "pending" ? (
                        <button className="sl-btn sm" name="status" value="processing">
                          <i className="fa-solid fa-box"></i> Accept &amp; pack
                        </button>
                      ) : null}
                      {o.status === "pending" || o.status === "processing" ? (
                        <button className="sl-btn sm" name="status" value="shipped">
                          <i className="fa-solid fa-truck-fast"></i> Mark shipped
                        </button>
                      ) : null}
                      {o.status === "shipped" ? (
                        <button className="sl-btn sm" name="status" value="completed">
                          <i className="fa-solid fa-circle-check"></i> Mark delivered
                        </button>
                      ) : null}
                      <button className="sl-btn danger sm" name="status" value="cancelled">
                        <i className="fa-solid fa-xmark"></i> Cancel order
                      </button>
                    </div>
                    <input name="note" placeholder="Note for this step (optional, e.g. reason for cancelling)" />
                  </form>
                ) : null}
                {o.history?.length ? (
                  <ul className="sl-small sl-muted" style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                    {o.history.map((h, i) => (
                      <li key={i}>
                        {new Date(h.at).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })} — {STATUS_LABEL[h.status]}
                        {h.note ? `: ${h.note}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </details>
          );
        })
      ) : (
        <div className="sl-card sl-empty">
          <i className="fa-solid fa-box-open"></i>
          No orders {status ? `marked “${STATUS_LABEL[status]}”` : "yet"}.
        </div>
      )}
    </>
  );
}
