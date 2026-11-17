import Link from "next/link";
import { notFound } from "next/navigation";
import { col } from "@/lib/db";
import { hydrateStories } from "@/lib/community";
import { featureOpen } from "@/lib/comingSoon";
import { SectionTabs, StoryRow } from "@/components/community/Chrome";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "Stories — Community" }, robots: "noindex, nofollow" };

export default async function StoriesPage() {
  if (!(await featureOpen("community"))) notFound();
  const stories = await hydrateStories(await (await col.stories()).find({ episodes: { $gt: 0 } }).sort({ updated_at: -1 }).limit(60).toArray());
  return (
    <div className="cm">
      <header className="cm-top">
        <h1>Community</h1>
        <Link href="/community/write/" className="cm-btn" rel="nofollow">
          <i className="fa-solid fa-pen"></i> Write
        </Link>
      </header>
      <SectionTabs active="stories" />
      <p className="cm-lead">Novels written by our members, one episode at a time.</p>
      {stories.length ? (
        <div className="cm-stories">
          {stories.map((s) => (
            <StoryRow key={s.id} s={s} />
          ))}
        </div>
      ) : (
        <div className="cm-empty">
          <p>No stories yet. Start yours — readers are waiting.</p>
          <Link href="/community/write/" className="cm-btn" rel="nofollow">
            Write a story
          </Link>
        </div>
      )}
    </div>
  );
}
