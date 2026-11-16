import Link from "next/link";
import type { PostCard } from "@/lib/types";
import { placeholderCover, thumbUrl } from "@/lib/utils";

/** Same markup as render_book_card() in index.php. */
export default function BookCard({ post, eager = false, coverClass = "mb-1.5", small = true }: { post: PostCard; eager?: boolean; coverClass?: string; small?: boolean }) {
  const img = post.image ? thumbUrl(post.image, 400) : placeholderCover(post.title);
  return (
    <Link href={`/${post.slug}/`} className="flex flex-col group cursor-pointer mb-6 no-underline">
      <div className={`book-cover-wrapper ${coverClass}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="book-cover-img" src={img} srcSet={post.image ? `${thumbUrl(post.image, 200)} 200w, ${thumbUrl(post.image, 400)} 400w` : undefined} sizes="(min-width: 1024px) 12vw, (min-width: 768px) 25vw, 50vw" alt={`${post.title} novel cover`} width={300} height={375} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} decoding="async" />
      </div>
      <h3 className="font-title-md text-title-md text-slate-800 dark:text-neutral-100 line-clamp-2 group-hover:text-primary transition-colors" style={small ? { fontSize: "1.0rem" } : undefined}>
        {post.title}
      </h3>
      <p className="font-body-md text-body-md text-slate-500 dark:text-neutral-400 mt-0.5">{post.writer_name}</p>
    </Link>
  );
}
