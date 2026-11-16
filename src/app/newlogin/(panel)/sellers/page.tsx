import Link from "next/link";
import { col } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { sellersOverview } from "@/lib/marketplace";
import { formatDate, thumbUrl } from "@/lib/utils";
import { Flash, Submit } from "@/components/admin/Fields";
import { createSeller } from "./actions";

export const metadata = { title: "Sellers" };

const TABS = [
  { k: "", l: "All" },
  { k: "pending", l: "Waiting approval" },
  { k: "active", l: "Active" },
  { k: "suspended", l: "Suspended" },
];

export default async function SellersPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; status?: string; q?: string; add?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = TABS.find((t) => t.k && t.k === sp.status)?.k || "";
  const term = (sp.q || "").trim().slice(0, 80);
  const q: Record<string, unknown> = {};
  if (status) q.status = status;
  if (term) {
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    q.$or = [{ store_name: rx }, { name: rx }, { email: rx }, { phone: rx }, { city: rx }];
  }
  const sellers = await col.sellers();
  const [rows, counts, ov, pendingBooks, revenue] = await Promise.all([
    sellers.find(q).sort({ _id: -1 }).limit(500).toArray(),
    sellers.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
    sellersOverview(),
    (await col.products()).countDocuments({ seller_id: { $gt: 0 }, status: "pending" }),
    (await col.orders()).aggregate<{ t: number; n: number }>([{ $match: { seller_id: { $gt: 0 }, status: "completed" } }, { $group: { _id: null, t: { $sum: "$subtotal" }, n: { $sum: 1 } } }]).toArray(),
  ]);
  const cnt = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  const total = counts.reduce((a, c) => a + c.n, 0);

  return (
    <>
      <Flash ok={sp.ok} err={sp.err} />
      <div className="a-grid a-g4" style={{ marginBottom: 14 }}>
        <div className="a-stat">
          <i className="fa-solid fa-user-tie"></i>
          <div>
            <b>{total}</b>
            <span>Sellers ({cnt.active || 0} active)</span>
          </div>
        </div>
        <Link href="?status=pending" className="a-stat">
          <i className="fa-solid fa-hourglass-half"></i>
          <div>
            <b>{cnt.pending || 0}</b>
            <span>Accounts waiting</span>
          </div>
        </Link>
        <Link href="/newlogin/products/?status=pending" className="a-stat">
          <i className="fa-solid fa-shield-halved"></i>
          <div>
            <b>{pendingBooks}</b>
            <span>Books in review</span>
          </div>
        </Link>
        <div className="a-stat">
          <i className="fa-solid fa-sack-dollar"></i>
          <div>
            <b>Rs {Math.round(revenue[0]?.t || 0).toLocaleString()}</b>
            <span>Sellers&apos; delivered sales ({revenue[0]?.n || 0})</span>
          </div>
        </div>
      </div>

      {sp.add === "1" ? (
        <form action={createSeller} className="a-card">
          <h3>
            <i className="fa-solid fa-user-plus"></i> Create a seller account
          </h3>
          <p className="a-muted" style={{ marginTop: 0, fontSize: ".82rem" }}>
            For writers who want you to set things up. They log in at <b>/seller/login/</b> with this email and password. The password is shown once after saving.
          </p>
          <div className="a-grid a-g3">
            <div className="a-field">
              <label>Full name *</label>
              <input name="name" required />
            </div>
            <div className="a-field">
              <label>Store / pen name</label>
              <input name="store_name" placeholder="same as name" />
            </div>
            <div className="a-field">
              <label>Email (login) *</label>
              <input name="email" type="email" required />
            </div>
            <div className="a-field">
              <label>Mobile (private)</label>
              <input name="phone" placeholder="03xx xxxxxxx" />
            </div>
            <div className="a-field">
              <label>City</label>
              <input name="city" />
            </div>
            <div className="a-field">
              <label>Password</label>
              <input name="password" type="text" autoComplete="off" placeholder="leave empty = generate one" />
            </div>
          </div>
          <label className="a-check">
            <input type="checkbox" name="verified" value="1" /> Verified badge (you know this writer)
          </label>
          <label className="a-check" style={{ marginBottom: 12 }}>
            <input type="checkbox" name="trusted" value="1" defaultChecked /> Trusted: clean books go live without review
          </label>
          <div className="a-row">
            <Submit>
              <i className="fa-solid fa-user-plus"></i> Create seller
            </Submit>
            <Link href="/newlogin/sellers/" className="a-btn a-btn-g">
              Cancel
            </Link>
          </div>
        </form>
      ) : null}

      <div className="a-tabs" style={{ flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <Link key={t.k || "all"} href={t.k ? `?status=${t.k}` : "?"} className={status === t.k ? "on" : ""}>
            {t.l} ({t.k ? cnt[t.k] || 0 : total})
          </Link>
        ))}
      </div>
      <form className="a-row" style={{ marginBottom: 12 }}>
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <input name="q" defaultValue={term} placeholder="Search store, name, email, phone, city…" style={{ flex: 1, maxWidth: 360 }} />
        <button className="a-btn a-btn-g a-btn-sm">Search</button>
        <span className="a-sp" />
        <Link href="?add=1" className="a-btn a-btn-p">
          <i className="fa-solid fa-user-plus"></i> Create seller
        </Link>
      </form>

      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Seller</th>
              <th>Status</th>
              <th>Books</th>
              <th>Orders</th>
              <th>Delivered sales</th>
              <th>Strikes</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((x) => {
                const p = ov.products.get(x._id);
                const o = ov.orders.get(x._id);
                return (
                  <tr key={x._id}>
                    <td>
                      <Link href={`/newlogin/sellers/${x._id}/`} className="a-row" style={{ flexWrap: "nowrap", textDecoration: "none" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {x.logo ? <img src={thumbUrl(x.logo, 200)} alt="" className="a-thumb" style={{ borderRadius: "50%", width: 38, height: 38 }} /> : <span className="adm-av" style={{ width: 38, height: 38 }}>{x.store_name.charAt(0)}</span>}
                        <div>
                          <b>
                            {x.store_name} {x.verified ? <i className="fa-solid fa-circle-check" style={{ color: "#38bdf8" }} title="Verified"></i> : null}
                          </b>
                          <div className="a-muted" style={{ fontSize: ".75rem" }}>
                            {x.name} · {x.email}
                            {x.city ? ` · ${x.city}` : ""}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td>
                      <span className={`a-pill ${x.status === "active" ? "ok" : x.status === "pending" ? "warn" : "bad"}`}>{x.status}</span>
                      {x.created_by === "admin" ? <div className="a-muted" style={{ fontSize: ".7rem" }}>made by admin</div> : null}
                    </td>
                    <td>
                      {p?.live || 0}/{p?.n || 0}
                      {p?.pending ? <span className="a-pill warn" style={{ marginLeft: 4 }}>{p.pending} review</span> : null}
                    </td>
                    <td>{o?.n || 0}</td>
                    <td>Rs {Math.round(o?.revenue || 0).toLocaleString()}</td>
                    <td>{x.strikes ? <span className={`a-pill ${x.strikes >= 5 ? "bad" : "warn"}`}>{x.strikes}</span> : <span className="a-muted">0</span>}</td>
                    <td className="a-muted" style={{ fontSize: ".78rem" }}>
                      {formatDate(x.created_at)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7}>
                  <div className="a-empty">
                    <i className="fa-solid fa-user-tie"></i>No sellers yet. Writers sign up at /seller/register/ or you can create one.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
