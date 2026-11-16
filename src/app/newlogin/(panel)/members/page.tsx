import Link from "next/link";
import { col } from "@/lib/db";
import { back, int, requireAdmin, str } from "@/lib/admin";
import { ConfirmButton, Flash } from "@/components/admin/Fields";
import { avatarColor, formatDate, initial, mediaUrl } from "@/lib/utils";

export const metadata = { title: "Members" };

async function act(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = int(fd, "id")!;
  const a = str(fd, "a");
  const m = await col.members();
  if (a === "suspend") await m.updateOne({ _id: id }, { $set: { status: "suspended" } });
  if (a === "activate") await m.updateOne({ _id: id }, { $set: { status: "active" } });
  if (a === "delete") {
    await m.deleteOne({ _id: id });
    await (await col.communityPosts()).deleteMany({ member_id: id });
    await (await col.communityLikes()).deleteMany({ member_id: id });
    await (await col.communityComments()).deleteMany({ member_id: id });
    await (await col.progress()).deleteMany({ member_id: id });
  }
  back("/newlogin/members/", "Member updated");
}

export default async function Members({ searchParams }: { searchParams: Promise<{ ok?: string; q?: string; status?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const q: Record<string, unknown> = {};
  if (sp.q) {
    const rx = new RegExp(sp.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    q.$or = [{ name: rx }, { email: rx }, { username: rx }, { phone: rx }];
  }
  if (sp.status) q.status = sp.status;
  const mc = await col.members();
  const [total, rows] = await Promise.all([mc.countDocuments(q), mc.find(q).sort({ _id: -1 }).skip((page - 1) * 40).limit(40).toArray()]);
  const ids = rows.map((r) => r._id);
  const [posts, reading] = await Promise.all([
    (await col.communityPosts()).aggregate<{ _id: number; n: number }>([{ $match: { member_id: { $in: ids } } }, { $group: { _id: "$member_id", n: { $sum: 1 } } }]).toArray(),
    (await col.progress()).aggregate<{ _id: number; n: number }>([{ $match: { member_id: { $in: ids } } }, { $group: { _id: "$member_id", n: { $sum: 1 } } }]).toArray(),
  ]);
  const pm = new Map(posts.map((p) => [p._id, p.n]));
  const rm = new Map(reading.map((p) => [p._id, p.n]));
  return (
    <>
      <Flash ok={sp.ok} />
      <form className="a-row a-card" style={{ padding: 12 }}>
        <input type="search" name="q" defaultValue={sp.q} placeholder="Search name, email, username, phone…" style={{ flex: 1 }} />
        <select name="status" defaultValue={sp.status} style={{ width: 160 }}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button className="a-btn a-btn-g">Search</button>
        <span className="a-muted">{total} members</span>
      </form>
      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Contact</th>
              <th>Login</th>
              <th>Activity</th>
              <th>Joined</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m._id}>
                <td>
                  <div className="a-row" style={{ flexWrap: "nowrap" }}>
                    {m.profile_pic && !/default_avatar/.test(m.profile_pic) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl(m.profile_pic)} alt="" className="adm-av" />
                    ) : (
                      <span className="adm-av" style={{ background: avatarColor(m.name), color: "#fff" }}>
                        {initial(m.name)}
                      </span>
                    )}
                    <div>
                      <b>{m.name}</b>
                      <div className="a-muted" style={{ fontSize: ".75rem" }}>
                        @{m.username}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: ".82rem" }}>
                  {m.email}
                  <div className="a-muted">{m.phone || ""}</div>
                </td>
                <td>{m.google_id ? <span className="a-pill info">Google</span> : <span className="a-pill">Email</span>}</td>
                <td className="a-muted" style={{ fontSize: ".78rem" }}>
                  {pm.get(m._id) || 0} posts · {rm.get(m._id) || 0} novels reading
                </td>
                <td className="a-muted" style={{ fontSize: ".78rem" }}>
                  {formatDate(m.created_at, false)}
                </td>
                <td>
                  <span className={`a-pill ${m.status === "active" ? "ok" : "bad"}`}>{m.status}</span>
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <form action={act} style={{ display: "inline-flex", gap: 6 }}>
                    <input type="hidden" name="id" value={m._id} />
                    <Link href={`/community/u/${encodeURIComponent(m.username)}/`} target="_blank" className="a-btn a-btn-g a-btn-xs">
                      Profile
                    </Link>
                    {m.status === "active" ? (
                      <button name="a" value="suspend" className="a-btn a-btn-g a-btn-xs">
                        Suspend
                      </button>
                    ) : (
                      <button name="a" value="activate" className="a-btn a-btn-p a-btn-xs">
                        Activate
                      </button>
                    )}
                    <ConfirmButton name="a" value="delete" className="a-btn a-btn-d a-btn-xs" message={`Delete ${m.name} and all their community posts?`}>
                      <i className="fa-solid fa-trash-can"></i>
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > 40 ? (
        <div className="a-pager">
          {Array.from({ length: Math.ceil(total / 40) }).map((_, i) => (
            <Link key={i} href={`?page=${i + 1}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className={i + 1 === page ? "on" : ""}>
              {i + 1}
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
