"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PostCard } from "@/lib/types";
import { placeholderCover, thumbUrl } from "@/lib/utils";

/**
 * Infinite scroll: the next page of novels is added to the same grid when the reader
 * gets near the end. No button and no page numbers on screen. (Search engines still
 * reach every page through the plain page links that stay in the HTML.)
 */
export default function LoadMore({ query, totalPages, start = 1 }: { query: string; totalPages: number; start?: number }) {
  const [page, setPage] = useState(start);
  const [items, setItems] = useState<PostCard[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const done = page >= totalPages;

  const load = async () => {
    if (busy || done) return;
    setBusy(true);
    setFailed(false);
    try {
      const r = await fetch(`/api/archive/?${query}&page=${page + 1}`);
      if (!r.ok) throw new Error();
      const d: { items: PostCard[] } = await r.json();
      setItems((x) => [...x, ...(d.items || [])]);
      setPage((p) => p + 1);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  };

  useEffect(() => {
    if (done || failed || !sentinel.current) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && load(), { rootMargin: "700px" });
    io.observe(sentinel.current);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, done, busy, failed]);

  return (
    <>
      {items.map((p) => (
        <Link key={p.id} href={`/${p.slug}/`} className="flex flex-col group cursor-pointer mb-6 no-underline">
          <div className="book-cover-wrapper mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="book-cover-img" src={p.image ? thumbUrl(p.image, 400) : placeholderCover(p.title)} alt={p.title} loading="lazy" width={300} height={375} />
          </div>
          <h3 className="font-title-md text-title-md text-slate-800 line-clamp-2 group-hover:text-primary transition-colors">{p.title}</h3>
          <p className="font-body-md text-body-md text-slate-500 mt-1">{p.writer_name}</p>
        </Link>
      ))}
      <div ref={sentinel} className="col-span-full" />
      {!done ? (
        <div className="col-span-full kn-inf" role="status" aria-live="polite">
          {failed ? (
            <button type="button" onClick={load}>
              Could not load more novels. Tap to try again
            </button>
          ) : (
            <span className="kn-inf-dots" aria-label="Loading more novels">
              <i></i>
              <i></i>
              <i></i>
            </span>
          )}
        </div>
      ) : null}
    </>
  );
}
