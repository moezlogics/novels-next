import { col } from "@/lib/db";
import { back, int, requireAdmin, str } from "@/lib/admin";
import { hydratePosts } from "@/lib/community";
import { deleteStoredFile } from "@/lib/storage";
import { ConfirmButton, Flash } from "@/components/admin/Fields";
import { formatDate, mediaUrl } from "@/lib/utils";

export const metadata = { title: "Community" };

async function act(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = int(fd, "id")!;
  if (str(fd, "a") === "delete-comment") {
    await (await col.communityComments()).deleteOne({ _id: id });
    back("/newlogin/community/", "Comment deleted");
  }
  const p = await (await col.communityPosts()).findOne({ _id: id });
  if (p) {
    await (await col.communityPosts()).deleteOne({ _id: id });
    await (await col.communityLikes()).deleteMany({ post_id: id });
    await (await col.communityComments()).deleteMany({ post_id: id });
    for (const i of p.images || []) await deleteStoredFile(i);
  }
  back("/newlogin/community/", "Post deleted");
}

export default async function CommunityAdmin({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const posts = await hydratePosts(await (await col.communityPosts()).find({}).sort({ created_at: -1 }).limit(100).toArray(), null);
  const comments = await (await col.communityComments()).find({}).sort({ created_at: -1 }).limit(30).toArray();
  const members = await (await col.members()).find({ _id: { $in: comments.map((c) => c.member_id) } }, { projection: { name: 1 } }).toArray();
  const mm = new Map(members.map((m) => [m._id, m.name]));
  return (
    <>
      <Flash ok={sp.ok} />
      <div className="a-main-side">
        <div>
          <h3 style={{ margin: "0 0 10px" }}>Posts ({posts.length})</h3>
          {posts.length ? (
            posts.map((p) => (
              <div className="a-card" key={p.id} style={{ padding: 14 }}>
                <div className="a-row">
                  <b>{p.author_name}</b>
                  <span className="a-muted" style={{ fontSize: ".78rem" }}>
                    @{p.author_username} · {formatDate(p.created_at)} {p.category_name ? `· ${p.category_name}` : ""}
                  </span>
                  <span className="a-sp" />
                  <span className="a-muted" style={{ fontSize: ".8rem" }}>
                    ♥ {p.likes_count} · 💬 {p.comments_count}
                  </span>
                  <a href={`/community/post/${p.id}/`} target="_blank" className="a-btn a-btn-g a-btn-xs">
                    View
                  </a>
                  <form action={act}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmButton className="a-btn a-btn-d a-btn-xs" message="Delete this post?">
                      <i className="fa-solid fa-trash-can"></i>
                    </ConfirmButton>
                  </form>
                </div>
                <p style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{p.content}</p>
                {p.images.length ? (
                  <div className="a-row" style={{ marginTop: 8 }}>
                    {p.images.map((i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={mediaUrl(i)} alt="" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8 }} />
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="a-card a-empty">No community posts</div>
          )}
        </div>
        <div className="a-card">
          <h3>
            <i className="fa-solid fa-comments"></i> Latest comments
          </h3>
          {comments.map((c) => (
            <div className="a-list-item" key={c._id}>
              <div style={{ flex: 1, minWidth: 0, fontSize: ".84rem" }}>
                <b>{mm.get(c.member_id) || "Member"}</b>: {c.comment}
              </div>
              <form action={act}>
                <input type="hidden" name="id" value={c._id} />
                <ConfirmButton name="a" value="delete-comment" className="a-btn a-btn-d a-btn-xs" message="Delete comment?">
                  <i className="fa-solid fa-trash-can"></i>
                </ConfirmButton>
              </form>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
