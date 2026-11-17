import { notFound, redirect } from "next/navigation";
import { col } from "@/lib/db";
import { getMemberId } from "@/lib/auth";
import { getCarouselCategories } from "@/lib/data";
import { featureOpen } from "@/lib/comingSoon";
import { hydrateStories } from "@/lib/community";
import { StoryRow, SubTop } from "@/components/community/Chrome";
import { StoryForm } from "@/components/community/Stories";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "Write a story — Community" }, robots: "noindex, nofollow" };

export default async function WritePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  if (!(await featureOpen("community"))) notFound();
  const viewer = await getMemberId();
  if (!viewer) redirect("/login/?return=/community/write/");
  const id = parseInt((await searchParams).id || "", 10) || 0;
  const [cats, story, mine] = await Promise.all([
    getCarouselCategories(),
    id ? (await col.stories()).findOne({ _id: id }) : null,
    id ? [] : (await col.stories()).find({ member_id: viewer }).sort({ updated_at: -1 }).limit(20).toArray(),
  ]);
  if (id && (!story || story.member_id !== viewer)) notFound();
  const myStories = await hydrateStories(mine);
  return (
    <div className="cm">
      <SubTop back={story ? `/community/story/${story._id}/` : "/community/stories/"} title={story ? "Edit story" : "Write a story"} />
      {myStories.length ? (
        <>
          <h3 className="cm-h">Continue a story</h3>
          <div className="cm-stories">
            {myStories.map((s) => (
              <StoryRow key={s.id} s={s} showAuthor={false} />
            ))}
          </div>
          <h3 className="cm-h">Or start a new one</h3>
        </>
      ) : null}
      <StoryForm
        story={story ? { id: story._id, title: story.title, description: story.description, cover: story.cover, category_id: story.category_id, status: story.status } : undefined}
        cats={cats.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
