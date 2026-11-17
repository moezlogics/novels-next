import { notFound, redirect } from "next/navigation";
import { col } from "@/lib/db";
import { getMemberId } from "@/lib/auth";
import { featureOpen } from "@/lib/comingSoon";
import { SubTop } from "@/components/community/Chrome";
import { EpisodeForm } from "@/components/community/Stories";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "Write episode — Community" }, robots: "noindex, nofollow" };

export default async function WriteEpisodePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ep?: string }> }) {
  if (!(await featureOpen("community"))) notFound();
  const id = parseInt((await params).id, 10) || 0;
  const viewer = await getMemberId();
  if (!viewer) redirect(`/login/?return=/community/story/${id}/write/`);
  const story = await (await col.stories()).findOne({ _id: id });
  if (!story || story.member_id !== viewer) notFound();
  const n = parseInt((await searchParams).ep || "", 10) || 0;
  const ep = n ? await (await col.storyEpisodes()).findOne({ story_id: id, n }) : null;
  if (n && !ep) notFound();
  return (
    <div className="cm cm-reader">
      <SubTop back={`/community/story/${id}/`} title={story.title} />
      <EpisodeForm storyId={id} n={ep?.n} nextN={story.episodes + 1} title={ep?.title} content={ep?.content} />
    </div>
  );
}
