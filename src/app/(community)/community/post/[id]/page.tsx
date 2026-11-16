import Link from "next/link";
import { notFound } from "next/navigation";
import { col } from "@/lib/db";
import { getMemberId } from "@/lib/auth";
import { hydratePosts } from "@/lib/community";
import { featureOpen } from "@/lib/comingSoon";
import { SinglePost } from "@/components/community/Community";
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
  return { title: { absolute: `${post.author_name}: ${excerpt(post.content, 60)}` }, description: excerpt(post.content, 155), robots: "noindex, nofollow" };
}

export default async function PostPage({ params }: Props) {
  if (!(await featureOpen("community"))) notFound();
  const post = await load(parseInt((await params).id, 10));
  if (!post) notFound();
  return (
    <div className="comm-profile-page">
      <header className="comm-topbar comm-mobile-only">
        <Link href="/community/" className="comm-icon-btn" rel="nofollow" style={{ textDecoration: "none" }}>
          <i className="fa-solid fa-arrow-left"></i>
        </Link>
        <h1 style={{ flex: 1, textAlign: "center", fontSize: "1rem" }}>Post</h1>
        <div style={{ width: 36 }}></div>
      </header>
      <div style={{ padding: 16, maxWidth: 640, margin: "0 auto" }}>
        <Link href="/community/" className="comm-btn comm-btn-ghost comm-btn-sm comm-desktop-only" rel="nofollow" style={{ marginBottom: 16, textDecoration: "none", display: "inline-flex" }}>
          <i className="fa-solid fa-arrow-left"></i> Back to feed
        </Link>
        <SinglePost post={post} />
      </div>
    </div>
  );
}
