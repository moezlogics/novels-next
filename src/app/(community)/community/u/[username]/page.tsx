import Link from "next/link";
import { notFound } from "next/navigation";
import { col } from "@/lib/db";
import { hydratePosts } from "@/lib/community";
import { featureOpen } from "@/lib/comingSoon";
import { ProfileOwnerActions } from "@/components/community/Community";
import { formatDate, mediaUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props) {
  const u = decodeURIComponent((await params).username);
  const m = await (await col.members()).findOne({ username: u }, { projection: { name: 1 } });
  return { title: { absolute: m ? `${m.name} (@${u})` : "Profile" }, robots: "noindex, follow" };
}

export default async function ProfilePage({ params }: Props) {
  if (!(await featureOpen("community"))) notFound();
  const username = decodeURIComponent((await params).username);
  const author = await (await col.members()).findOne({ username });
  if (!author) notFound();
  const posts = await hydratePosts(await (await col.communityPosts()).find({ member_id: author._id }).sort({ created_at: -1 }).limit(100).toArray(), null);
  const pic = author.profile_pic && !/default_avatar/i.test(author.profile_pic) ? mediaUrl(author.profile_pic) : "/uploads/community/default_avatar.png";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const joined = new Date(author.created_at);
  return (
    <div className="comm-profile-page">
      <header className="comm-topbar comm-mobile-only">
        <Link href="/community/" className="comm-icon-btn" rel="nofollow" style={{ textDecoration: "none" }}>
          <i className="fa-solid fa-arrow-left"></i>
        </Link>
        <h1 style={{ flex: 1, textAlign: "center" }}>Profile</h1>
        <div style={{ width: 36 }}></div>
      </header>
      <div className="comm-profile-hero"></div>
      <div className="comm-profile-card-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pic} alt="" className="big-avatar" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#0f172a" }}>{author.name}</div>
            <div style={{ fontSize: ".85rem", color: "#94a3b8" }}>@{author.username}</div>
          </div>
          <ProfileOwnerActions username={author.username} />
        </div>
        {author.bio ? <p style={{ margin: "12px 0 0", fontSize: ".9rem", color: "#475569", lineHeight: 1.6 }}>{author.bio}</p> : null}
        <div className="comm-stat-row">
          <div>
            <div className="comm-stat-num">{posts.length}</div>
            <div className="comm-stat-label">Posts</div>
          </div>
          <div>
            <div className="comm-stat-num">{posts.reduce((a, p) => a + p.likes_count, 0)}</div>
            <div className="comm-stat-label">Likes</div>
          </div>
          <div>
            <div className="comm-stat-num">{`${months[joined.getMonth()]} ${joined.getFullYear()}`}</div>
            <div className="comm-stat-label">Joined</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "0 16px" }}>
        <div className="comm-panel-title" style={{ padding: "0 4px 10px" }}>
          Posts
        </div>
        {!posts.length ? (
          <div className="comm-empty" style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf1" }}>
            <i className="fa-regular fa-pen-to-square"></i>
            <p>No posts yet.</p>
          </div>
        ) : (
          posts.map((p) => (
            <Link key={p.id} href={`/community/post/${p.id}/`} className="comm-post" rel="nofollow" style={{ display: "block", textDecoration: "none", color: "inherit", marginBottom: 8, borderRadius: 14, border: "1px solid #e8ecf1" }}>
              {p.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(p.images[0])} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 10, marginBottom: 10 }} loading="lazy" />
              ) : null}
              <div style={{ fontSize: ".92rem", lineHeight: 1.6, color: "#334155", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.content}</div>
              <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: ".78rem", color: "#94a3b8" }}>
                {p.category_name ? <span className="comm-post-badge">{p.category_name}</span> : null}
                <span>
                  <i className="fa-regular fa-heart"></i> {p.likes_count}
                </span>
                <span>
                  <i className="fa-regular fa-comment"></i> {p.comments_count}
                </span>
                <span>{formatDate(p.created_at, false)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
