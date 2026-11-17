import Link from "next/link";
import { col, nextId } from "@/lib/db";
import { back, bustSite, int, requireAdmin, str } from "@/lib/admin";
import { ConfirmButton, Flash, Submit } from "@/components/admin/Fields";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Comments" };

async function act(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = int(fd, "id")!;
  const a = str(fd, "a");
  const c = await col.comments();
  if (a === "approve") await c.updateOne({ _id: id }, { $set: { status: "approved" } });
  if (a === "pending") await c.updateOne({ _id: id }, { $set: { status: "pending" } });
  if (a === "delete") {
    await c.deleteOne({ _id: id });
    await c.deleteMany({ parent_id: id });
  }
  bustSite();
  back("/newlogin/comments/", "Done");
}

async function reply(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const parent = await (await col.comments()).findOne({ _id: int(fd, "id")! });
  const msg = str(fd, "message", 3000);
  if (!parent || !msg) back("/newlogin/comments/", "Write a reply first", "err");
  const rootId = parent.parent_id || parent._id;
  await (await col.comments()).insertOne({
    _id: await nextId("comments"),
    post_id: parent.post_id,
    member_id: null,
    parent_id: rootId,
    reply_to: parent._id !== rootId ? parent.name : null,
    reply_to_id: parent._id,
    name: admin.username,
    email: admin.email,
    ip_address: "admin",
    is_admin: true,
    message: msg,
    status: "approved",
    created_at: new Date(),
  });
  bustSite();
  back("/newlogin/comments/", "Reply posted ✓");
}

export default async function Comments({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; status?: string; page?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const q: Record<string, unknown> = {};
  if (sp.status === "pending" || sp.status === "approved") q.status = sp.status;
  if (sp.q) q.message = new RegExp(sp.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const cc = await col.comments();
  const [total, rows] = await Promise.all([cc.countDocuments(q), cc.find(q).sort({ _id: -1 }).skip((page - 1) * 30).limit(30).toArray()]);
  const posts = await (await col.posts()).find({ _id: { $in: [...new Set(rows.map((r) => r.post_id))] } }, { projection: { title: 1, slug: 1 } }).toArray();
  const pm = new Map(posts.map((p) => [p._id, p]));
  return (
    <>
      <Flash ok={sp.ok} err={sp.err} />
      <div className="a-row" style={{ marginBottom: 12 }}>
        <div className="a-tabs" style={{ marginBottom: 0, border: 0 }}>
          <Link href="?" className={!sp.status ? "on" : ""}>
            All
          </Link>
          <Link href="?status=pending" className={sp.status === "pending" ? "on" : ""}>
            Pending
          </Link>
          <Link href="?status=approved" className={sp.status === "approved" ? "on" : ""}>
            Approved
          </Link>
        </div>
        <span className="a-sp" />
        <form className="a-row">
          <input type="search" name="q" defaultValue={sp.q} placeholder="Search comments…" />
          <button className="a-btn a-btn-g a-btn-sm">Search</button>
        </form>
      </div>
      {rows.length ? (
        rows.map((c) => {
          const p = pm.get(c.post_id);
          return (
            <div className="a-card" key={c._id} style={{ padding: 14 }}>
              <div className="a-row" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{c.name}</b> {c.is_admin ? <span className="a-pill info">Admin</span> : null} <span className={`a-pill ${c.status === "approved" ? "ok" : "warn"}`}>{c.status}</span>
                  <span className="a-muted" style={{ fontSize: ".76rem" }}>
                    {" "}
                    · {formatDate(c.created_at)} · {c.ip_address}
                  </span>
                  <div className="a-muted" style={{ fontSize: ".78rem" }}>
                    on{" "}
                    {p ? (
                      <a href={`/${p.slug}/#comments`} target="_blank">
                        {p.title}
                      </a>
                    ) : (
                      "deleted novel"
                    )}
                    {c.reply_to ? ` · ↳ ${c.reply_to}` : c.parent_id ? " · reply" : ""}
                    {c.flag_reason ? <span style={{ color: "#b45309", fontWeight: 600 }}> · {c.flag_reason}</span> : null}
                  </div>
                  <p style={{ margin: "8px 0 0", whiteSpace: "pre-line" }}>{c.message}</p>
                </div>
                <form action={act} className="a-row">
                  <input type="hidden" name="id" value={c._id} />
                  {c.status === "pending" ? (
                    <button name="a" value="approve" className="a-btn a-btn-p a-btn-xs">
                      Approve
                    </button>
                  ) : (
                    <button name="a" value="pending" className="a-btn a-btn-g a-btn-xs">
                      Unapprove
                    </button>
                  )}
                  <ConfirmButton name="a" value="delete" className="a-btn a-btn-d a-btn-xs" message="Delete this comment and its replies?">
                    Delete
                  </ConfirmButton>
                </form>
              </div>
              {!c.is_admin ? (
                <details style={{ marginTop: 8 }}>
                  <summary className="a-muted" style={{ cursor: "pointer", fontSize: ".82rem" }}>
                    <i className="fa-solid fa-reply"></i> Reply as admin
                  </summary>
                  <form action={reply} className="a-row" style={{ marginTop: 8 }}>
                    <input type="hidden" name="id" value={c._id} />
                    <input type="text" name="message" placeholder="Write your reply…" style={{ flex: 1 }} />
                    <Submit className="a-btn a-btn-p a-btn-sm">Reply</Submit>
                  </form>
                </details>
              ) : null}
            </div>
          );
        })
      ) : (
        <div className="a-card a-empty">
          <i className="fa-solid fa-comments"></i>No comments
        </div>
      )}
      {total > 30 ? (
        <div className="a-pager">
          {Array.from({ length: Math.ceil(total / 30) }).map((_, i) => (
            <Link key={i} href={`?page=${i + 1}${sp.status ? `&status=${sp.status}` : ""}`} className={i + 1 === page ? "on" : ""}>
              {i + 1}
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
