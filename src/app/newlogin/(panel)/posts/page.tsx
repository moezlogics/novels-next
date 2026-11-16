import Link from "next/link";
import { col } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { extractDriveId, formatDate, thumbUrl } from "@/lib/utils";
import { Flash, Submit } from "@/components/admin/Fields";
import { bulkPosts } from "./actions";
import SelectAll from "@/components/admin/SelectAll";

export const metadata = { title: "All Novels" };

type SP = { q?: string; status?: string; cat?: string; writer?: string; page?: string; ok?: string; err?: string; sort?: string };

export default async function PostsList({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const limit = 25;
  const q: Record<string, unknown> = {};
  if (sp.q) q.title = new RegExp(sp.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  if (sp.status === "active" || sp.status === "draft") q.status = sp.status;
  if (sp.cat) q.category_ids = parseInt(sp.cat, 10);
  if (sp.writer) q.writer_id = parseInt(sp.writer, 10);
  const sort: Record<string, 1 | -1> = sp.sort === "reads" ? { reads: -1 } : sp.sort === "views" ? { views: -1 } : sp.sort === "title" ? { title: 1 } : { _id: -1 };

  const posts = await col.posts();
  const [total, rows, cats, writers, counts] = await Promise.all([
    posts.countDocuments(q),
    posts.find(q, { projection: { description: 0 } }).sort(sort).skip((page - 1) * limit).limit(limit).toArray(),
    (await col.categories()).find({}, { projection: { name: 1 } }).sort({ name: 1 }).toArray(),
    (await col.writers()).find({}, { projection: { name: 1 } }).sort({ name: 1 }).toArray(),
    posts.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
  ]);
  const cm = new Map(cats.map((c) => [c._id, c.name]));
  const wm = new Map(writers.map((w) => [w._id, w.name]));
  const pages = Math.ceil(total / limit);
  const n = (s: string) => counts.find((c) => c._id === s)?.n || 0;
  const qs = (extra: Record<string, string | number>) => {
    const u = new URLSearchParams();
    Object.entries({ q: sp.q, status: sp.status, cat: sp.cat, writer: sp.writer, sort: sp.sort, ...extra }).forEach(([k, v]) => v && u.set(k, String(v)));
    return `?${u}`;
  };

  return (
    <>
      <Flash ok={sp.ok} err={sp.err} />
      <div className="a-row" style={{ marginBottom: 14 }}>
        <div className="a-tabs" style={{ marginBottom: 0, border: 0 }}>
          <Link href={qs({ status: "", page: "" })} className={!sp.status ? "on" : ""}>
            All ({n("active") + n("draft")})
          </Link>
          <Link href={qs({ status: "active", page: "" })} className={sp.status === "active" ? "on" : ""}>
            Published ({n("active")})
          </Link>
          <Link href={qs({ status: "draft", page: "" })} className={sp.status === "draft" ? "on" : ""}>
            Drafts ({n("draft")})
          </Link>
        </div>
        <span className="a-sp" />
        <Link href="/newlogin/posts/new/" className="a-btn a-btn-p">
          <i className="fa-solid fa-plus"></i> Add Novel
        </Link>
      </div>

      <form className="a-card a-row" style={{ padding: 12 }}>
        <input type="search" name="q" defaultValue={sp.q} placeholder="Search by title…" style={{ flex: 2, minWidth: 180 }} />
        <select name="cat" defaultValue={sp.cat} style={{ flex: 1, minWidth: 150 }}>
          <option value="">All categories</option>
          {cats.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="writer" defaultValue={sp.writer} style={{ flex: 1, minWidth: 150 }}>
          <option value="">All writers</option>
          {writers.map((w) => (
            <option key={w._id} value={w._id}>
              {w.name}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sp.sort} style={{ flex: 1, minWidth: 130 }}>
          <option value="">Newest first</option>
          <option value="reads">Most read</option>
          <option value="views">Most viewed</option>
          <option value="title">Title A–Z</option>
        </select>
        {sp.status ? <input type="hidden" name="status" value={sp.status} /> : null}
        <button className="a-btn a-btn-g">
          <i className="fa-solid fa-filter"></i> Filter
        </button>
      </form>

      <form action={bulkPosts}>
        <div className="a-row" style={{ marginBottom: 10 }}>
          <select name="bulk" style={{ width: 200 }}>
            <option value="publish">Publish</option>
            <option value="draft">Move to draft</option>
            <option value="check">Check Drive links</option>
            <option value="delete">Delete permanently</option>
          </select>
          <Submit className="a-btn a-btn-g a-btn-sm" pendingText="Applying…">
            Apply to selected
          </Submit>
          <span className="a-sp" />
          <span className="a-muted" style={{ fontSize: ".82rem" }}>
            {total} novels
          </span>
        </div>
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>
                  <SelectAll />
                </th>
                <th>Novel</th>
                <th>Writer</th>
                <th>Category</th>
                <th>Stats</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <input type="checkbox" name="ids" value={p._id} className="row-check" />
                    </td>
                    <td>
                      <div className="a-row" style={{ flexWrap: "nowrap" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={thumbUrl(p.image, 200)} alt="" className="a-thumb" />
                        <div style={{ minWidth: 0 }}>
                          <Link href={`/newlogin/posts/edit/${p._id}/`} style={{ fontWeight: 700, textDecoration: "none" }}>
                            {p.title}
                          </Link>
                          <div className="a-muted" style={{ fontSize: ".74rem" }}>
                            /{p.slug}/ {p.series_id ? `· S${p.season_number}` : ""} {p.pages ? `· ${p.pages} pages` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{(p.writer_id && wm.get(p.writer_id)) || <span className="a-muted">—</span>}</td>
                    <td style={{ maxWidth: 200 }}>
                      {(p.category_id && cm.get(p.category_id)) || "—"}
                      {p.additional_categories?.length ? <span className="a-muted"> +{p.additional_categories.length}</span> : null}
                    </td>
                    <td className="a-muted" style={{ fontSize: ".78rem", whiteSpace: "nowrap" }}>
                      <i className="fa-solid fa-eye"></i> {p.views || 0} · <i className="fa-solid fa-book-open-reader"></i> {p.reads || 0}
                      <br />
                      {extractDriveId(p.read_online_url) ? (
                        p.pdf_size ? (
                          <span className="a-pill ok" title="Drive file is public — reader ready">
                            <i className="fa-solid fa-bolt"></i> Ready
                          </span>
                        ) : (
                          <span className="a-pill warn" title="Not checked yet — use bulk action Check Drive links">
                            Unchecked
                          </span>
                        )
                      ) : null}
                    </td>
                    <td>
                      <span className={`a-pill ${p.status === "active" ? "ok" : "warn"}`}>{p.status === "active" ? "Published" : "Draft"}</span>
                      {p.is_featured ? (
                        <span className="a-pill info" style={{ marginLeft: 4 }}>
                          ★
                        </span>
                      ) : null}
                    </td>
                    <td className="a-muted" style={{ fontSize: ".78rem", whiteSpace: "nowrap" }}>
                      {formatDate(p.posted_date, false)}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <Link href={`/newlogin/posts/edit/${p._id}/`} className="a-btn a-btn-g a-btn-xs">
                        <i className="fa-solid fa-pen"></i> Edit
                      </Link>{" "}
                      <a href={`/${p.slug}/`} target="_blank" className="a-btn a-btn-g a-btn-xs" title="View">
                        <i className="fa-solid fa-arrow-up-right-from-square"></i>
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className="a-empty">
                      <i className="fa-solid fa-book"></i>No novels found
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </form>
      {pages > 1 ? (
        <div className="a-pager">
          {Array.from({ length: pages }).map((_, i) =>
            i + 1 === page ? (
              <span key={i} className="on">
                {i + 1}
              </span>
            ) : (
              <Link key={i} href={qs({ page: i + 1 })}>
                {i + 1}
              </Link>
            ),
          )}
        </div>
      ) : null}
    </>
  );
}
