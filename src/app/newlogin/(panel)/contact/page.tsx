import Link from "next/link";
import { col } from "@/lib/db";
import { back, int, requireAdmin, str } from "@/lib/admin";
import { ConfirmButton, Flash } from "@/components/admin/Fields";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Contact Messages" };

async function act(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = int(fd, "id")!;
  const a = str(fd, "a");
  const c = await col.contact();
  if (a === "delete") await c.deleteOne({ _id: id });
  else if (["new", "read", "archived"].includes(a)) await c.updateOne({ _id: id }, { $set: { status: a as "new" | "read" | "archived" } });
  back("/newlogin/contact/", "Updated");
}

export default async function Contact({ searchParams }: { searchParams: Promise<{ ok?: string; status?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = sp.status ? { status: sp.status as "new" } : { status: { $ne: "archived" as const } };
  const rows = await (await col.contact()).find(q).sort({ _id: -1 }).limit(200).toArray();
  return (
    <>
      <Flash ok={sp.ok} />
      <div className="a-tabs">
        <Link href="?" className={!sp.status ? "on" : ""}>
          Inbox
        </Link>
        <Link href="?status=new" className={sp.status === "new" ? "on" : ""}>
          Unread
        </Link>
        <Link href="?status=archived" className={sp.status === "archived" ? "on" : ""}>
          Archived
        </Link>
      </div>
      {rows.length ? (
        rows.map((m) => (
          <div className="a-card" key={m._id} style={{ padding: 14, borderColor: m.status === "new" ? "rgba(108,200,50,.45)" : undefined }}>
            <div className="a-row" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{m.subject}</b> {m.status === "new" ? <span className="a-pill ok">New</span> : null}
                <div className="a-muted" style={{ fontSize: ".8rem" }}>
                  {m.name} · <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}>{m.email}</a> · {formatDate(m.created_at)}
                </div>
                <p style={{ margin: "8px 0 0", whiteSpace: "pre-line" }}>{m.message}</p>
              </div>
              <form action={act} className="a-row">
                <input type="hidden" name="id" value={m._id} />
                <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="a-btn a-btn-p a-btn-xs">
                  <i className="fa-solid fa-reply"></i> Reply
                </a>
                {m.status === "new" ? (
                  <button name="a" value="read" className="a-btn a-btn-g a-btn-xs">
                    Mark read
                  </button>
                ) : (
                  <button name="a" value="new" className="a-btn a-btn-g a-btn-xs">
                    Mark unread
                  </button>
                )}
                {m.status !== "archived" ? (
                  <button name="a" value="archived" className="a-btn a-btn-g a-btn-xs">
                    Archive
                  </button>
                ) : null}
                <ConfirmButton name="a" value="delete" className="a-btn a-btn-d a-btn-xs" message="Delete this message?">
                  <i className="fa-solid fa-trash-can"></i>
                </ConfirmButton>
              </form>
            </div>
          </div>
        ))
      ) : (
        <div className="a-card a-empty">
          <i className="fa-solid fa-envelope"></i>No messages
        </div>
      )}
    </>
  );
}
