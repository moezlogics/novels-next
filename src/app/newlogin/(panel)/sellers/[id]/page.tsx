import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { col } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { STATUS_LABEL, sellerStats } from "@/lib/marketplace";
import { formatDate, thumbUrl } from "@/lib/utils";
import { ConfirmButton, Flash, Submit } from "@/components/admin/Fields";
import { sellerAdminAction } from "../actions";

export const metadata = { title: "Seller" };

export default async function SellerDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const sid = parseInt(id, 10) || 0;
  const x = await (await col.sellers()).findOne({ _id: sid });
  if (!x) notFound();
  const pw = (await cookies()).get("kn_seller_pw")?.value || "";
  const [st, products, orders] = await Promise.all([
    sellerStats(sid),
    (await col.products()).find({ seller_id: sid }).sort({ _id: -1 }).limit(100).toArray(),
    (await col.orders()).find({ seller_id: sid }).sort({ _id: -1 }).limit(50).toArray(),
  ]);
  const act = (a: string, label: React.ReactNode, cls = "a-btn a-btn-g a-btn-sm", confirm?: string) => (
    <form action={sellerAdminAction} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={sid} />
      {confirm ? (
        <ConfirmButton name="a" value={a} className={cls} message={confirm}>
          {label}
        </ConfirmButton>
      ) : (
        <button name="a" value={a} className={cls}>
          {label}
        </button>
      )}
    </form>
  );
  const views30 = st.days.reduce((a, d) => a + d.views, 0);

  return (
    <>
      <Flash ok={sp.ok} err={sp.err} />
      {pw ? (
        <div className="a-alert" style={{ marginBottom: 12, borderColor: "#fbbf24" }}>
          <i className="fa-solid fa-key"></i> Login for this seller — copy it now, it is shown only once:
          <div style={{ marginTop: 6, fontFamily: "ui-monospace,Consolas,monospace" }}>
            Email: <b style={{ userSelect: "all" }}>{x.email}</b> · Password: <b style={{ userSelect: "all" }}>{pw}</b> · Login page: <b>/seller/login/</b>
          </div>
        </div>
      ) : null}

      <div className="a-card">
        <div className="a-row" style={{ gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {x.logo ? <img src={thumbUrl(x.logo, 200)} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} /> : <span className="adm-av" style={{ width: 64, height: 64, fontSize: "1.4rem" }}>{x.store_name.charAt(0)}</span>}
          <div>
            <h3 style={{ margin: 0 }}>
              {x.store_name} {x.verified ? <i className="fa-solid fa-circle-check" style={{ color: "#38bdf8" }}></i> : null}{" "}
              <span className={`a-pill ${x.status === "active" ? "ok" : x.status === "pending" ? "warn" : "bad"}`}>{x.status}</span>
            </h3>
            <div className="a-muted" style={{ fontSize: ".82rem" }}>
              {x.name} · {x.email} · {x.phone || "no phone"} · {x.city || "no city"} · joined {formatDate(x.created_at)}
              {x.last_login ? ` · last login ${formatDate(x.last_login)}` : ""}
            </div>
          </div>
          <span className="a-sp" />
          {x.status === "active" ? (
            <a className="a-btn a-btn-g a-btn-sm" href={`/shop/seller/${x.slug}/`} target="_blank">
              <i className="fa-solid fa-store"></i> Store page
            </a>
          ) : null}
        </div>
        <div className="a-row" style={{ marginTop: 14, gap: 6 }}>
          {x.status !== "active" ? act("approve", <><i className="fa-solid fa-check"></i> {x.status === "pending" ? "Approve account" : "Re-activate"}</>, "a-btn a-btn-p a-btn-sm") : act("suspend", <><i className="fa-solid fa-ban"></i> Suspend</>, "a-btn a-btn-d a-btn-sm", "Suspend this seller? Their books will be hidden.")}
          {act(x.verified ? "unverify" : "verify", <><i className="fa-solid fa-circle-check"></i> {x.verified ? "Remove verified badge" : "Give verified badge"}</>)}
          {x.approved_products < 999 ? act("trust", <><i className="fa-solid fa-handshake"></i> Trust (skip review)</>) : null}
          {x.strikes ? act("reset_strikes", <><i className="fa-solid fa-eraser"></i> Clear {x.strikes} strikes</>) : null}
          {act("login_as", <><i className="fa-solid fa-user-secret"></i> Open their dashboard</>)}
          {act("delete", <><i className="fa-solid fa-trash-can"></i> Delete</>, "a-btn a-btn-d a-btn-sm", "Delete this seller and ALL their books? This cannot be undone.")}
        </div>
      </div>

      <div className="a-grid a-g4" style={{ marginBottom: 14 }}>
        {[
          ["fa-sack-dollar", `Rs ${Math.round(st.revenue).toLocaleString()}`, "Delivered sales"],
          ["fa-truck-fast", `Rs ${Math.round(st.pendingRevenue).toLocaleString()}`, "On the way"],
          ["fa-box", String(st.orders.total), `Orders (${st.orders.pending} new)`],
          ["fa-book", `${st.products.active}/${st.products.total}`, `Live books (${st.products.pending} in review)`],
          ["fa-cart-shopping", String(st.sold), "Copies sold"],
          ["fa-eye", st.views.toLocaleString(), `Views (${views30.toLocaleString()} in 30 days)`],
          ["fa-percent", `${st.conversion}%`, "Views → orders"],
          ["fa-triangle-exclamation", String(x.strikes), "Blocked spam attempts"],
        ].map(([icon, big, small]) => (
          <div className="a-stat" key={small}>
            <i className={`fa-solid ${icon}`}></i>
            <div>
              <b>{big}</b>
              <span>{small}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="a-grid a-g2">
        <form action={sellerAdminAction} className="a-card">
          <h3>
            <i className="fa-solid fa-pen"></i> Details
          </h3>
          <input type="hidden" name="id" value={sid} />
          <div className="a-grid a-g2">
            <div className="a-field">
              <label>Name</label>
              <input name="name" defaultValue={x.name} />
            </div>
            <div className="a-field">
              <label>Store name</label>
              <input name="store_name" defaultValue={x.store_name} />
            </div>
            <div className="a-field">
              <label>Email (login)</label>
              <input name="email" type="email" defaultValue={x.email} />
            </div>
            <div className="a-field">
              <label>Phone</label>
              <input name="phone" defaultValue={x.phone} />
            </div>
            <div className="a-field">
              <label>City</label>
              <input name="city" defaultValue={x.city} />
            </div>
          </div>
          <div className="a-field">
            <label>Admin notes (only admins see this)</label>
            <textarea name="notes" rows={3} defaultValue={x.notes || ""} />
          </div>
          <Submit name="a" value="save">
            <i className="fa-solid fa-floppy-disk"></i> Save
          </Submit>
        </form>
        <div className="a-card">
          <h3>
            <i className="fa-solid fa-key"></i> Password
          </h3>
          <p className="a-muted" style={{ marginTop: 0, fontSize: ".82rem" }}>
            Set a new password if the seller forgot theirs. It is shown once after saving.
          </p>
          <form action={sellerAdminAction} className="a-row">
            <input type="hidden" name="id" value={sid} />
            <input name="password" autoComplete="off" placeholder="leave empty = generate one" style={{ flex: 1 }} />
            <button name="a" value="password" className="a-btn a-btn-g">
              Set password
            </button>
          </form>
          <h3 style={{ marginTop: 18 }}>
            <i className="fa-solid fa-store"></i> Store settings
          </h3>
          <p style={{ fontSize: ".85rem", margin: 0 }}>
            Shipping Rs {x.shipping_fee}
            {x.free_shipping_over ? ` · free over Rs ${x.free_shipping_over}` : ""} · ships in {x.processing_days} days
            <br />
            Trust: {x.approved_products >= 999 ? "trusted (no review)" : `${x.approved_products} approved books`}
          </p>
          {x.bio ? <p className="a-muted" style={{ fontSize: ".82rem", whiteSpace: "pre-line" }}>{x.bio}</p> : null}
        </div>
      </div>

      <div className="a-card">
        <h3>
          <i className="fa-solid fa-book"></i> Books ({products.length})
          <span className="a-sp" />
          <Link href={`/newlogin/products/?seller=${sid}`} className="a-btn a-btn-g a-btn-xs">
            Manage all
          </Link>
        </h3>
        <div className="a-table-wrap" style={{ margin: 0 }}>
          <table className="a-table">
            <tbody>
              {products.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div className="a-row" style={{ flexWrap: "nowrap" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbUrl(p.image, 200)} alt="" className="a-thumb" />
                      <div>
                        <b>{p.title}</b>
                        <div className="a-muted" style={{ fontSize: ".75rem" }}>
                          Rs {p.sale_price || p.price} · stock {p.stock} · {p.views || 0} views · {Math.max(0, p.sold || 0)} sold
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`a-pill ${p.status === "active" ? "ok" : p.status === "pending" ? "warn" : p.status === "rejected" ? "bad" : ""}`}>{p.status === "pending" ? "in review" : p.status}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/newlogin/products/?edit=${p._id}`} className="a-btn a-btn-g a-btn-xs">
                      <i className="fa-solid fa-pen"></i>
                    </Link>
                  </td>
                </tr>
              ))}
              {!products.length ? (
                <tr>
                  <td className="a-muted">No books yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="a-card">
        <h3>
          <i className="fa-solid fa-box"></i> Latest orders
          <span className="a-sp" />
          <Link href={`/newlogin/orders/?seller=${sid}`} className="a-btn a-btn-g a-btn-xs">
            All orders
          </Link>
        </h3>
        {orders.length ? (
          <div className="a-table-wrap" style={{ margin: 0 }}>
            <table className="a-table">
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id}>
                    <td>
                      <Link href={`/newlogin/orders/?open=${o._id}&seller=${sid}`}>#{o._id}</Link>
                    </td>
                    <td>
                      {o.name} · {o.city}
                    </td>
                    <td>Rs {Math.round(o.total).toLocaleString()}</td>
                    <td>
                      <span className={`a-pill ${o.status === "completed" ? "ok" : o.status === "cancelled" ? "bad" : "warn"}`}>{STATUS_LABEL[o.status]}</span>
                    </td>
                    <td className="a-muted" style={{ fontSize: ".78rem" }}>
                      {formatDate(o.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="a-muted">No orders yet.</p>
        )}
      </div>
    </>
  );
}
