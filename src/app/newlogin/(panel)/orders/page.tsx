import Link from "next/link";
import { col } from "@/lib/db";
import { back, int, requireAdmin, str } from "@/lib/admin";
import { ConfirmButton, Flash } from "@/components/admin/Fields";
import { formatDate, whatsappUrl } from "@/lib/utils";
import type { Order } from "@/lib/types";
import { STATUS_LABEL, setOrderStatus } from "@/lib/marketplace";

export const metadata = { title: "Orders" };

const STATUSES: Order["status"][] = ["pending", "processing", "shipped", "completed", "cancelled"];

async function update(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = int(fd, "id")!;
  const orders = await col.orders();
  if (str(fd, "a") === "delete") {
    await orders.deleteOne({ _id: id });
    back("/newlogin/orders/", `Order #${id} deleted`);
  }
  const status = str(fd, "status") as Order["status"];
  const o = await orders.findOne({ _id: id });
  if (!o || !STATUSES.includes(status)) back("/newlogin/orders/", "Invalid", "err");
  // cancelling puts stock back; un-cancelling takes it again (inside setOrderStatus)
  await setOrderStatus(o, status, `admin:${admin.username}`, { courier: str(fd, "courier", 60), tracking_number: str(fd, "tracking_number", 60), note: str(fd, "note", 200) || undefined });
  back(`/newlogin/orders/?open=${id}`, `Order #${id} → ${status}`);
}

export default async function Orders({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; status?: string; q?: string; open?: string; seller?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q: Record<string, unknown> = {};
  if (sp.status) q.status = sp.status;
  const sellerId = parseInt(sp.seller || "", 10) || 0;
  if (sellerId === -1) q.seller_id = { $in: [null, 0] };
  else if (sellerId) q.seller_id = sellerId;
  if (sp.q) {
    const rx = new RegExp(sp.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    q.$or = [{ name: rx }, { phone: rx }, { email: rx }, { city: rx }, ...(parseInt(sp.q, 10) ? [{ _id: parseInt(sp.q, 10) }] : [])];
  }
  const [rows, counts] = await Promise.all([(await col.orders()).find(q).sort({ _id: -1 }).limit(200).toArray(), (await col.orders()).aggregate<{ _id: string; n: number; t: number }>([{ $group: { _id: "$status", n: { $sum: 1 }, t: { $sum: "$total" } } }]).toArray()]);
  const c = (s: string) => counts.find((x) => x._id === s);
  const sellers = await (await col.sellers()).find({}, { projection: { store_name: 1 } }).sort({ store_name: 1 }).toArray();
  const sm = new Map(sellers.map((x) => [x._id, x.store_name]));
  const open = parseInt(sp.open || "", 10);
  return (
    <>
      <Flash ok={sp.ok} err={sp.err} />
      <div className="a-grid a-g4" style={{ marginBottom: 14, gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))" }}>
        {STATUSES.map((s) => (
          <Link key={s} href={`?status=${s}`} className="a-stat">
            <i className={`fa-solid ${s === "pending" ? "fa-clock" : s === "processing" ? "fa-box" : s === "shipped" ? "fa-truck" : s === "completed" ? "fa-circle-check" : "fa-ban"}`}></i>
            <div>
              <b>{c(s)?.n || 0}</b>
              <span>
                {STATUS_LABEL[s]} · Rs {Math.round(c(s)?.t || 0).toLocaleString()}
              </span>
            </div>
          </Link>
        ))}
      </div>
      <form className="a-row a-card" style={{ padding: 12 }}>
        <input type="search" name="q" defaultValue={sp.q} placeholder="Search name, phone, city or #id…" style={{ flex: 1 }} />
        <select name="status" defaultValue={sp.status} style={{ width: 170 }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select name="seller" defaultValue={sp.seller} style={{ width: 190 }}>
          <option value="">All sellers</option>
          <option value="-1">Site&apos;s own books</option>
          {sellers.map((x) => (
            <option key={x._id} value={x._id}>
              {x.store_name}
            </option>
          ))}
        </select>
        <button className="a-btn a-btn-g">Filter</button>
      </form>
      {rows.length ? (
        rows.map((o) => (
          <details key={o._id} className="a-card" style={{ padding: 14 }} open={open === o._id}>
            <summary style={{ cursor: "pointer", listStyle: "none" }} className="a-row">
              <b>#{o._id}</b>
              <span>{o.name}</span>
              <span className="a-pill">{o.seller_id ? sm.get(o.seller_id) || `Seller #${o.seller_id}` : "Site"}</span>
              <span className="a-muted">
                {o.city} · {formatDate(o.created_at)}
              </span>
              <span className="a-sp" />
              <b>Rs {Math.round(o.total).toLocaleString()}</b>
              <span className={`a-pill ${o.status === "completed" ? "ok" : o.status === "cancelled" ? "bad" : o.status === "processing" || o.status === "shipped" ? "info" : "warn"}`}>{STATUS_LABEL[o.status]}</span>
            </summary>
            <div className="a-grid a-g2" style={{ marginTop: 12 }}>
              <div>
                <p style={{ margin: "0 0 6px" }}>
                  <i className="fa-solid fa-phone"></i> <a href={`tel:${o.phone}`}>{o.phone}</a>
                  {whatsappUrl(o.phone) ? (
                    <>
                      {" "}
                      ·{" "}
                      <a href={whatsappUrl(o.phone)} target="_blank">
                        WhatsApp
                      </a>
                    </>
                  ) : null}
                </p>
                <p style={{ margin: "0 0 6px" }}>
                  <i className="fa-solid fa-envelope"></i> {o.email}
                </p>
                <p style={{ margin: "0 0 6px" }}>
                  <i className="fa-solid fa-location-dot"></i> {o.address}, {o.city}
                </p>
                {o.notes ? <p className="a-muted">Note: {o.notes}</p> : null}
                {o.tracking_number ? (
                  <p style={{ margin: "0 0 6px" }}>
                    <i className="fa-solid fa-truck"></i> {o.courier || "Courier"}: <b>{o.tracking_number}</b>
                  </p>
                ) : null}
                {o.seller_id ? (
                  <p style={{ margin: "0 0 6px" }}>
                    <i className="fa-solid fa-store"></i> Shipped by <Link href={`/newlogin/sellers/${o.seller_id}/`}>{sm.get(o.seller_id) || `Seller #${o.seller_id}`}</Link>
                  </p>
                ) : null}
                {o.history?.length ? (
                  <ul className="a-muted" style={{ fontSize: ".75rem", paddingLeft: 16, margin: "6px 0" }}>
                    {o.history.map((h, k) => (
                      <li key={k}>
                        {formatDate(h.at)} — {STATUS_LABEL[h.status]} ({h.by}){h.note ? `: ${h.note}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="a-muted" style={{ fontSize: ".78rem" }}>
                  {o.member_id ? `Member #${o.member_id}` : "Guest"} · {o.payment_method} ·{" "}
                  <a href={`/shop/success/?order_id=${o._id}&token=${o.tracking_token}`} target="_blank">
                    tracking page
                  </a>
                </p>
              </div>
              <div>
                {o.items.map((i, k) => (
                  <div key={k} className="a-row" style={{ fontSize: ".86rem", marginBottom: 4 }}>
                    <span style={{ flex: 1 }}>
                      {i.title} × {i.quantity}
                    </span>
                    <b>Rs {i.price * i.quantity}</b>
                  </div>
                ))}
                <div className="a-row a-muted" style={{ fontSize: ".82rem" }}>
                  <span style={{ flex: 1 }}>Shipping</span>
                  {o.shipping ? `Rs ${o.shipping}` : "Free"}
                </div>
                <form action={update} className="a-row" style={{ marginTop: 10 }}>
                  <input type="hidden" name="id" value={o._id} />
                  <input name="courier" defaultValue={o.courier || ""} placeholder="Courier" style={{ flex: "1 1 110px" }} />
                  <input name="tracking_number" defaultValue={o.tracking_number || ""} placeholder="Tracking no." style={{ flex: "1 1 130px" }} />
                  <select name="status" defaultValue={o.status} style={{ flex: "1 1 120px" }}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <button className="a-btn a-btn-p a-btn-sm">Update</button>
                  <ConfirmButton name="a" value="delete" className="a-btn a-btn-d a-btn-sm" message={`Delete order #${o._id}?`}>
                    <i className="fa-solid fa-trash-can"></i>
                  </ConfirmButton>
                </form>
              </div>
            </div>
          </details>
        ))
      ) : (
        <div className="a-card a-empty">
          <i className="fa-solid fa-box"></i>No orders
        </div>
      )}
    </>
  );
}
