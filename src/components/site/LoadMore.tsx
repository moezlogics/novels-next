"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PostCard } from "@/lib/types";
import { placeholderCover, thumbUrl } from "@/lib/utils";

/** "Load More" + infinite scroll (new) — appends cards into the same grid. */
export default function LoadMore({ query, totalPages, start = 1 }: { query: string; totalPages: number; start?: number }) {
  const [page, setPage] = useState(start);
  const [items, setItems] = useState<PostCard[]>([]);
  const [busy, setBusy] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const done = page >= totalPages;

  const load = async () => {
    if (busy || done) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/archive/?${query}&page=${page + 1}`);
      const d: { items: PostCard[] } = await r.json();
      setItems((x) => [...x, ...(d.items || [])]);
      setPage((p) => p + 1);
    } catch {}
    setBusy(false);
  };

  useEffect(() => {
    if (done || !sentinel.current || page < start + 1) return; // first click is manual, then auto
    const io = new IntersectionObserver((e) => e[0].isIntersecting && load(), { rootMargin: "600px" });
    io.observe(sentinel.current);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, done, busy]);

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
        <div className="col-span-full mt-12 text-center">
          <button className="btn-brand" onClick={load} disabled={busy}>
            Load More {busy ? <i className="fa-solid fa-spinner fa-spin"></i> : null}
          </button>
        </div>
      ) : null}
    </>
  );
}
