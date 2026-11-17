import Link from "next/link";
import { notFound } from "next/navigation";
import { col } from "@/lib/db";
import { getMemberId } from "@/lib/auth";
import { hydratePosts, hydrateStories } from "@/lib/community";
import { featureOpen } from "@/lib/comingSoon";
import { Avatar, ProfileActions, ProfilePosts } from "@/components/community/Community";
import { StoryRow, SubTop } from "@/components/community/Chrome";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ tab?: string }> };

export async function generateMetadata({ params }: Props) {
  const u = decodeURIComponent((await params).username);
  const m = await (await col.members()).findOne({ username: u }, { projection: { name: 1 } });
  return { title: { absolute: m ? `${m.name} (@${u})` : "Profile" }, robots: "noindex, nofollow" };
}

const n = (x: number) => x.toLocaleString("en-PK");

export default async function ProfilePage({ params, searchParams }: Props) {
  if (!(await featureOpen("community"))) notFound();
  const username = decodeURIComponent((await params).username);
  const author = await (await col.members()).findOne({ username });
  if (!author) notFound();
  const viewer = await getMemberId();
  const owner = viewer === author._id;
  const [posts, stories] = await Promise.all([
    hydratePosts(await (await col.communityPosts()).find({ member_id: author._id }).sort({ created_at: -1 }).limit(100).toArray(), viewer),
    hydrateStories(await (await col.stories()).find(owner ? { member_id: author._id } : { member_id: author._id, episodes: { $gt: 0 } }).sort({ updated_at: -1 }).limit(50).toArray()),
  ]);
  const tab = (await searchParams).tab === "stories" ? "stories" : "posts";
  const likes = posts.reduce((a, p) => a + p.likes_count, 0);
  const views = posts.reduce((a, p) => a + p.views, 0) + stories.reduce((a, s) => a + s.views, 0);
  const base = `/community/u/${encodeURIComponent(author.username)}/`;

  return (
    <div className="cm">
      <SubTop back="/community/" title={author.name} />
      <section className="cm-pf">
        <Avatar src={author.profile_pic} name={author.name} size={72} />
        <div className="cm-pf-id">
          <h2>{author.name}</h2>
          <p className="cm-muted">@{author.username}</p>
        </div>
        {author.bio ? (
          <p className="cm-pf-bio" dir="auto">
            {author.bio}
          </p>
        ) : null}
        <p className="cm-pf-stats">
          <span>
            <b>{n(posts.length)}</b> posts
          </span>
          <span>
            <b>{n(stories.length)}</b> stories
          </span>
          <span>
            <b>{n(likes)}</b> likes
          </span>
          {owner ? (
            <span title="Only you can see this">
              <b>{n(views)}</b> views
            </span>
          ) : null}
        </p>
        <ProfileActions username={author.username} name={author.name} />
      </section>

      <nav className="cm-tabs" aria-label="Profile sections">
        <Link href={base} rel="nofollow" className={tab === "posts" ? "on" : ""}>
          Posts
        </Link>
        <Link href={`${base}?tab=stories`} rel="nofollow" className={tab === "stories" ? "on" : ""}>
          Stories
        </Link>
      </nav>

      {tab === "posts" ? (
        <ProfilePosts posts={posts} owner={owner} />
      ) : stories.length ? (
        <div className="cm-stories">
          {stories.map((s) => (
            <StoryRow key={s.id} s={s} showAuthor={false} />
          ))}
        </div>
      ) : (
        <div className="cm-empty">
          <p>{owner ? "You haven't written a story yet." : "No stories yet."}</p>
          {owner ? (
            <Link href="/community/write/" className="cm-btn" rel="nofollow">
              Write a story
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
