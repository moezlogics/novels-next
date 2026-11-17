import Link from "next/link";
import { notFound } from "next/navigation";
import { col } from "@/lib/db";
import { getMemberId } from "@/lib/auth";
import { hydratePosts } from "@/lib/community";
import { featureOpen } from "@/lib/comingSoon";
import { SubTop } from "@/components/community/Chrome";
import { SinglePost } from "@/components/community/Community";
import { EpisodeBody, OwnerTools } from "@/components/community/Stories";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string; n: string }> };

async function load(p: Props["params"]) {
  const { id, n } = await p;
  const story = await (await col.stories()).findOne({ _id: parseInt(id, 10) || 0 });
  if (!story) return null;
  const ep = await (await col.storyEpisodes()).findOne({ story_id: story._id, n: parseInt(n, 10) || 0 });
  return ep ? { story, ep } : null;
}

export async function generateMetadata({ params }: Props) {
  const x = await load(params);
  return { title: { absolute: x ? `${x.story.title} — Episode ${x.ep.n}` : "Episode" }, robots: "noindex, nofollow" };
}

export default async function EpisodePage({ params }: Props) {
  if (!(await featureOpen("community"))) notFound();
  const x = await load(params);
  if (!x) notFound();
  const { story, ep } = x;
  const viewer = await getMemberId();
  const owner = viewer === story.member_id;
  if (!owner) {
    // a read by someone else counts for the episode and for the story
    void (await col.storyEpisodes()).updateOne({ _id: ep._id }, { $inc: { views: 1 } });
    void (await col.stories()).updateOne({ _id: story._id }, { $inc: { views: 1 } });
  }
  const [author, postRow] = await Promise.all([
    (await col.members()).findOne({ _id: story.member_id }, { projection: { name: 1, username: 1 } }),
    (await col.communityPosts()).findOne({ _id: ep.post_id }),
  ]);
  const post = postRow ? (await hydratePosts([postRow], viewer))[0] : null;
  const base = `/community/story/${story._id}/`;
  const words = ep.content.trim().split(/\s+/).length;
  return (
    <div className="cm cm-reader">
      <SubTop back={base} title={story.title} />
      <article>
        <header className="cm-ep-head">
          <small>
            Episode {ep.n} of {story.episodes}
          </small>
          <h2 dir="auto">{ep.title || `Episode ${ep.n}`}</h2>
          <p className="cm-muted">
            {author ? (
              <Link href={`/community/u/${encodeURIComponent(author.username)}/`} rel="nofollow">
                {author.name}
              </Link>
            ) : (
              "Writer"
            )}{" "}
            · {Math.max(1, Math.round(words / 200))} min read{owner ? ` · ${ep.views.toLocaleString("en-PK")} reads` : ""}
          </p>
        </header>
        {owner ? <OwnerTools storyId={story._id} n={ep.n} canDeleteEpisode={ep.n === story.episodes} /> : null}
        <EpisodeBody content={ep.content} />
      </article>
      <nav className="cm-ep-nav" aria-label="Episodes">
        {ep.n > 1 ? (
          <Link href={`${base}${ep.n - 1}/`} rel="nofollow" className="cm-btn ghost">
            <i className="fa-solid fa-chevron-left"></i> Previous
          </Link>
        ) : (
          <span></span>
        )}
        <Link href={base} rel="nofollow" className="cm-link">
          All episodes
        </Link>
        {ep.n < story.episodes ? (
          <Link href={`${base}${ep.n + 1}/`} rel="nofollow" className="cm-btn">
            Next <i className="fa-solid fa-chevron-right"></i>
          </Link>
        ) : (
          <span className="cm-muted">{story.status === "complete" ? "The end" : "More soon"}</span>
        )}
      </nav>
      {post ? <SinglePost post={post} bare /> : null}
    </div>
  );
}
