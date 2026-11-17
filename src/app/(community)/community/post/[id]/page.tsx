import { notFound, redirect } from "next/navigation";
import { col } from "@/lib/db";
import { getMemberId } from "@/lib/auth";
import { hydratePosts } from "@/lib/community";
import { featureOpen } from "@/lib/comingSoon";
import { SinglePost } from "@/components/community/Community";
import { SubTop } from "@/components/community/Chrome";
import { excerpt } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function load(id: number) {
  const p = await (await col.communityPosts()).findOne({ _id: id });
  if (!p) return null;
  return (await hydratePosts([p], await getMemberId()))[0];
}

export async function generateMetadata({ params }: Props) {
  const post = await load(parseInt((await params).id, 10));
  if (!post) return { title: "Post not found" };
  return { title: { absolute: `${post.author_name}: ${excerpt(post.content, 60)}` }, robots: "noindex, nofollow" };
}

export default async function PostPage({ params }: Props) {
  if (!(await featureOpen("community"))) notFound();
  const post = await load(parseInt((await params).id, 10));
  if (!post) notFound();
  // an episode's post opens the episode itself
  if (post.story) redirect(`/community/story/${post.story.id}/${post.story.n}/`);
  return (
    <div className="cm">
      <SubTop back="/community/" title="Post" />
      <div className="cm-feed">
        <SinglePost post={post} />
      </div>
    </div>
  );
}
