import Link from "next/link";
import { notFound } from "next/navigation";
import { col } from "@/lib/db";
import { getMemberId } from "@/lib/auth";
import { hydrateStories } from "@/lib/community";
import { featureOpen } from "@/lib/comingSoon";
import { timeAgo } from "@/lib/utils";
import { StoryCover, SubTop } from "@/components/community/Chrome";
import { OwnerTools } from "@/components/community/Stories";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const s = await (await col.stories()).findOne({ _id: parseInt((await params).id, 10) || 0 }, { projection: { title: 1 } });
  return { title: { absolute: s ? `${s.title} — Story` : "Story" }, robots: "noindex, nofollow" };
}

export default async function StoryPage({ params }: Props) {
  if (!(await featureOpen("community"))) notFound();
  const row = await (await col.stories()).findOne({ _id: parseInt((await params).id, 10) || 0 });
  if (!row) notFound();
  const [[s], viewer, eps] = await Promise.all([
    hydrateStories([row]),
    getMemberId(),
    (await col.storyEpisodes()).find({ story_id: row._id }, { projection: { n: 1, title: 1, created_at: 1 } }).sort({ n: 1 }).toArray(),
  ]);
  const owner = viewer === s.member_id;
  return (
    <div className="cm">
      <SubTop back="/community/stories/" title="Story" />
      <section className="cm-story-head">
        <StoryCover cover={s.cover} title={s.title} />
        <div>
          <h2 dir="auto">{s.title}</h2>
          <p className="cm-muted">
            by{" "}
            <Link href={`/community/u/${encodeURIComponent(s.author_username)}/`} rel="nofollow">
              {s.author_name}
            </Link>
          </p>
          <p className="cm-muted">
            {s.episodes} {s.episodes === 1 ? "episode" : "episodes"} · {s.status === "complete" ? "Complete" : "Ongoing"} · {s.views.toLocaleString("en-PK")} reads
          </p>
          {eps.length ? (
            <Link href={`/community/story/${s.id}/1/`} className="cm-btn" rel="nofollow">
              Start reading
            </Link>
          ) : null}
        </div>
      </section>
      {s.description ? (
        <p className="cm-story-desc" dir="auto">
          {s.description}
        </p>
      ) : null}
      {owner ? <OwnerTools storyId={s.id} /> : null}
      <h3 className="cm-h">Episodes</h3>
      {eps.length ? (
        <ol className="cm-eplist">
          {eps.map((e) => (
            <li key={e.n}>
              <Link href={`/community/story/${s.id}/${e.n}/`} rel="nofollow">
                <span className="cm-epn">{e.n}</span>
                <span className="cm-eptitle" dir="auto">
                  {e.title || `Episode ${e.n}`}
                </span>
                <time>{timeAgo(e.created_at)}</time>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="cm-empty">
          <p>{owner ? "No episodes yet. Write the first one." : "The writer has not published an episode yet."}</p>
        </div>
      )}
    </div>
  );
}
