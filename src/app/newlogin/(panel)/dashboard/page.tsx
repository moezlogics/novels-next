import Link from "next/link";
import { col } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { formatDate, thumbUrl } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const a = await requireAdmin();
  const { denied } = await searchParams;
  const posts = await col.posts();
  const [active, drafts, cats, writers, comments, pending, members, orders, products, msgs, totals, top, recentPosts, recentComments, recentOrders, pdfs, revenue] = await Promise.all([
    posts.countDocuments({ status: "active" }),
    posts.countDocuments({ status: "draft" }),
    (await col.categories()).countDocuments(),
    (await col.writers()).countDocuments(),
    (await col.comments()).countDocuments(),
    (await col.comments()).countDocuments({ status: "pending" }),
    (await col.members()).countDocuments(),
    (await col.orders()).countDocuments(),
    (await col.products()).countDocuments(),
    (await col.contact()).countDocuments({ status: "new" }),
    posts.aggregate<{ views: number; reads: number; downloads: number }>([{ $group: { _id: null, views: { $sum: "$views" }, reads: { $sum: "$reads" }, downloads: { $sum: "$downloads" } } }]).toArray(),
    posts.find({ status: "active" }, { projection: { title: 1, slug: 1, image: 1, views: 1, reads: 1, downloads: 1 } }).sort({ reads: -1, views: -1 }).limit(8).toArray(),
    posts.find({}, { projection: { title: 1, status: 1, posted_date: 1, image: 1 } }).sort({ _id: -1 }).limit(6).toArray(),
    (await col.comments()).find({}).sort({ _id: -1 }).limit(6).toArray(),
    (await col.orders()).find({}).sort({ _id: -1 }).limit(6).toArray(),
    posts.aggregate<{ n: number }>([{ $match: { status: "active", pdf_size: { $gt: 0 } } }, { $count: "n" }]).toArray(),
    (await col.orders()).aggregate<{ t: number }>([{ $match: { status: { $ne: "cancelled" } } }, { $group: { _id: null, t: { $sum: "$total" } } }]).toArray(),
  ]);
  const [sellerCount, sellerWaiting, booksReview] = await Promise.all([
    (await col.sellers()).countDocuments(),
    (await col.sellers()).countDocuments({ status: "pending" }),
    (await col.products()).countDocuments({ status: "pending" }),
  ]);
  const t = totals[0] || { views: 0, reads: 0, downloads: 0 };
  const maxReads = Math.max(1, ...top.map((p) => p.reads || p.views || 0));
  const A = "/newlogin";
  const stat = (href: string, icon: string, n: number | string, label: string) => (
    <Link href={href} className="a-stat">
      <i className={`fa-solid ${icon}`}></i>
      <div>
        <b>{typeof n === "number" ? n.toLocaleString() : n}</b>
        <span>{label}</span>
      </div>
    </Link>
  );
  return (
    <>
      {denied ? <div className="a-alert err">That section is only for the main admin.</div> : null}
      <div className="a-row" style={{ marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.35rem" }}>Assalam o Alaikum, {a.username} 👋</h2>
          <p className="a-muted" style={{ margin: "4px 0 0" }}>Here is what is happening on your site.</p>
        </div>
        <span className="a-sp" />
        <Link href={`${A}/posts/new/`} className="a-btn a-btn-p">
          <i className="fa-solid fa-plus"></i> Add Novel
        </Link>
      </div>

      <div className="a-grid a-g4" style={{ marginBottom: 18 }}>
        {stat(`${A}/posts/`, "fa-book", active, `Published novels${drafts ? ` · ${drafts} drafts` : ""}`)}
        {stat(`${A}/categories/`, "fa-folder", cats, "Categories")}
        {stat(`${A}/writers/`, "fa-user-pen", writers, "Writers")}
        {stat(`${A}/members/`, "fa-users", members, "Members")}
        {stat(`${A}/posts/`, "fa-eye", t.views, "Novel page views")}
        {stat(`${A}/posts/`, "fa-book-open-reader", t.reads, "Reader opens")}
        {stat(`${A}/posts/`, "fa-download", t.downloads, "Downloads")}
        {stat(`${A}/comments/`, "fa-comments", comments, `Comments${pending ? ` · ${pending} pending` : ""}`)}
        {stat(`${A}/orders/`, "fa-box", orders, "Orders")}
        {stat(`${A}/orders/`, "fa-sack-dollar", `Rs ${Math.round(revenue[0]?.t || 0).toLocaleString()}`, "Order revenue")}
        {stat(`${A}/products/`, "fa-store", products, "Shop products")}
        {stat(`${A}/contact/`, "fa-envelope", msgs, "New messages")}
        {stat(`${A}/sellers/`, "fa-user-tie", sellerCount, `Sellers${sellerWaiting ? ` · ${sellerWaiting} waiting` : ""}`)}
        {stat(`${A}/products/?status=pending`, "fa-shield-halved", booksReview, "Books in review")}
      </div>

      <div className="a-grid a-g2">
        <div className="a-card">
          <h3>
            <i className="fa-solid fa-fire"></i> Most read novels
          </h3>
          {top.length ? (
            <>
              <div className="a-bars" style={{ marginBottom: 26 }}>
                {top.map((p) => (
                  <div key={p._id} style={{ height: `${Math.max(3, ((p.reads || p.views || 0) / maxReads) * 100)}%` }} title={`${p.title}: ${p.reads || 0} reads, ${p.views || 0} views`}>
                    <span>{p.reads || 0}</span>
                  </div>
                ))}
              </div>
              {top.map((p) => (
                <div className="a-list-item" key={p._id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbUrl(p.image, 200)} alt="" className="a-thumb" style={{ width: 30, height: 44 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`${A}/posts/edit/${p._id}/`} style={{ fontWeight: 700, textDecoration: "none" }}>
                      {p.title}
                    </Link>
                    <div className="a-muted" style={{ fontSize: ".78rem" }}>
                      {p.reads || 0} reads · {p.views || 0} views · {p.downloads || 0} downloads
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="a-empty">Stats start counting as readers visit.</div>
          )}
        </div>

        <div>
          <div className="a-card">
            <h3>
              <i className="fa-solid fa-clock-rotate-left"></i> Recently added
            </h3>
            {recentPosts.map((p) => (
              <div className="a-list-item" key={p._id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`${A}/posts/edit/${p._id}/`} style={{ fontWeight: 600, textDecoration: "none" }}>
                    {p.title}
                  </Link>
                  <div className="a-muted" style={{ fontSize: ".75rem" }}>
                    {formatDate(p.posted_date)}
                  </div>
                </div>
                <span className={`a-pill ${p.status === "active" ? "ok" : "warn"}`}>{p.status === "active" ? "Published" : "Draft"}</span>
              </div>
            ))}
          </div>
          <div className="a-card">
            <h3>
              <i className="fa-solid fa-comments"></i> Latest comments
            </h3>
            {recentComments.length ? (
              recentComments.map((c) => (
                <div className="a-list-item" key={c._id}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: ".86rem" }}>{c.name}</b> <span className="a-muted" style={{ fontSize: ".75rem" }}>{formatDate(c.created_at)}</span>
                    <div style={{ fontSize: ".84rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.message}</div>
                  </div>
                  {c.status === "pending" ? <span className="a-pill warn">Pending</span> : null}
                </div>
              ))
            ) : (
              <div className="a-empty">No comments yet</div>
            )}
            <Link href={`${A}/comments/`} className="a-btn a-btn-g a-btn-sm" style={{ marginTop: 8 }}>
              Manage comments
            </Link>
          </div>
        </div>
      </div>

      <div className="a-grid a-g2">
        <div className="a-card">
          <h3>
            <i className="fa-solid fa-box"></i> Recent orders
          </h3>
          {recentOrders.length ? (
            recentOrders.map((o) => (
              <div className="a-list-item" key={o._id}>
                <div style={{ flex: 1 }}>
                  <b>#{o._id}</b> {o.name} <span className="a-muted">· {o.city}</span>
                  <div className="a-muted" style={{ fontSize: ".75rem" }}>
                    {formatDate(o.created_at)}
                  </div>
                </div>
                <b>Rs {Math.round(o.total).toLocaleString()}</b>
                <span className={`a-pill ${o.status === "completed" ? "ok" : o.status === "cancelled" ? "bad" : o.status === "processing" ? "info" : "warn"}`}>{o.status}</span>
              </div>
            ))
          ) : (
            <div className="a-empty">No orders yet</div>
          )}
        </div>
        <div className="a-card">
          <h3>
            <i className="fa-solid fa-bolt"></i> Reader health
          </h3>
          <p className="a-muted" style={{ marginTop: 0 }}>
            Novels with a reachable Google Drive file. Private or deleted files show up on the Tools page.
          </p>
          <div className="a-row" style={{ marginBottom: 10 }}>
            <b style={{ fontSize: "1.6rem" }}>{pdfs[0]?.n || 0}</b>
            <span className="a-muted">of {active} novels ready</span>
          </div>
          <div className="a-progress">
            <span style={{ width: `${Math.min(100, ((pdfs[0]?.n || 0) / Math.max(1, active)) * 100)}%` }}></span>
          </div>
          <Link href={`${A}/tools/`} className="a-btn a-btn-p a-btn-sm" style={{ marginTop: 14 }}>
            <i className="fa-solid fa-stethoscope"></i> Check Drive links
          </Link>
        </div>
      </div>
    </>
  );
}
