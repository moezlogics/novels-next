import Link from "next/link";
import { notFound } from "next/navigation";
import { col } from "@/lib/db";
import { getMemberId } from "@/lib/auth";
import { hydratePosts } from "@/lib/community";
import { featureOpen } from "@/lib/comingSoon";
import { ProfileOwnerActions, ProfilePosts, ProfileShare } from "@/components/community/Community";
import { mediaUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props) {
  const u = decodeURIComponent((await params).username);
  const m = await (await col.members()).findOne({ username: u }, { projection: { name: 1 } });
  return { title: { absolute: m ? `${m.name} (@${u})` : "Profile" }, robots: "noindex, nofollow" };
}

const n = (x: number) => x.toLocaleString("en-PK");

export default async function ProfilePage({ params }: Props) {
  if (!(await featureOpen("community"))) notFound();
  const username = decodeURIComponent((await params).username);
  const author = await (await col.members()).findOne({ username });
  if (!author) notFound();
  const viewer = await getMemberId();
  const owner = viewer === author._id;
  const posts = await hydratePosts(await (await col.communityPosts()).find({ member_id: author._id }).sort({ created_at: -1 }).limit(100).toArray(), viewer);

  const likes = posts.reduce((a, p) => a + p.likes_count, 0);
  const comments = posts.reduce((a, p) => a + p.comments_count, 0);
  const views = posts.reduce((a, p) => a + p.views, 0);
  const best = [...posts].sort((a, b) => b.likes_count * 3 + b.comments_count * 4 + b.views - (a.likes_count * 3 + a.comments_count * 4 + a.views))[0];
  const pic = author.profile_pic && !/default_avatar/i.test(author.profile_pic) ? mediaUrl(author.profile_pic) : "";
  const joined = new Date(author.created_at).toLocaleDateString("en-PK", { month: "long", year: "numeric" });

  return (
    <div className="cp">
      <div className="cp-cover" />
      <section className="cp-head">
        <div className="cp-avatar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {pic ? <img src={pic} alt="" /> : <span>{author.name.charAt(0).toUpperCase()}</span>}
        </div>
        <div className="cp-id">
          <h1>{author.name}</h1>
          <p className="cp-handle">@{author.username}</p>
          {author.bio ? <p className="cp-bio">{author.bio}</p> : null}
          <p className="cp-joined">
            <i className="fa-regular fa-calendar"></i> Joined {joined}
          </p>
        </div>
        <div className="cp-actions">
          {owner ? (
            <>
              <Link href="/community/?compose=1" className="comm-btn comm-btn-primary comm-btn-sm" rel="nofollow">
                <i className="fa-solid fa-plus"></i> New post
              </Link>
              <ProfileOwnerActions username={author.username} />
            </>
          ) : (
            <ProfileShare name={author.name} />
          )}
          <Link href="/community/" className="comm-btn comm-btn-ghost comm-btn-sm" rel="nofollow">
            <i className="fa-solid fa-arrow-left"></i> Feed
          </Link>
        </div>
        <div className="cp-stats">
          <div>
            <b>{n(posts.length)}</b>
            <span>Posts</span>
          </div>
          <div>
            <b>{n(likes)}</b>
            <span>Likes</span>
          </div>
          <div>
            <b>{n(comments)}</b>
            <span>Comments</span>
          </div>
          {owner ? (
            <div>
              <b>{n(views)}</b>
              <span>Views</span>
            </div>
          ) : null}
        </div>
      </section>

      {owner && posts.length ? (
        <section className="cp-card cp-insights" aria-label="Your insights">
          <h2>
            <i className="fa-solid fa-chart-simple"></i> Your insights <small>only you can see this</small>
          </h2>
          <div className="cp-insight-grid">
            <div>
              <b>{n(views)}</b>
              <span>Total views</span>
            </div>
            <div>
              <b>{(Math.round((views / posts.length) * 10) / 10).toLocaleString()}</b>
              <span>Views per post</span>
            </div>
            <div>
              <b>{views ? `${Math.round(((likes + comments) / views) * 1000) / 10}%` : "—"}</b>
              <span>Engagement</span>
            </div>
          </div>
          {best ? (
            <Link href={`/community/post/${best.id}/`} className="cp-best" rel="nofollow">
              <span className="cp-best-tag">Top post</span>
              <span className="cp-best-text">{best.content.slice(0, 120) || "Photo post"}</span>
              <span className="cp-best-nums">
                <i className="fa-regular fa-eye"></i> {n(best.views)} · <i className="fa-regular fa-heart"></i> {n(best.likes_count)} · <i className="fa-regular fa-comment"></i> {n(best.comments_count)}
              </span>
            </Link>
          ) : null}
        </section>
      ) : null}

      <section className="cp-posts" aria-label="Posts">
        <h2 className="cp-posts-title">Posts</h2>
        <ProfilePosts posts={posts} owner={owner} />
      </section>
    </div>
  );
}
