"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Banner } from "@/lib/types";
import { letterImage, mediaUrl, thumbUrl } from "@/lib/utils";

export function CategoryCarousel({ cats }: { cats: { id: number; name: string; slug: string; image: string }[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(true);
  const update = useCallback(() => {
    const c = box.current;
    if (!c) return;
    setLeft(c.scrollLeft > 5);
    setRight(c.scrollLeft + c.clientWidth < c.scrollWidth - 5);
  }, []);
  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);
  const scroll = (dir: number) => {
    box.current?.scrollBy({ left: box.current.clientWidth * 0.7 * dir, behavior: "smooth" });
    setTimeout(update, 400);
  };
  return (
    <div className="relative w-full cat-carousel-wrapper">
      <div className="cat-nav-fade-wrap cat-nav-fade-left" style={{ display: left ? "flex" : "none" }}>
        <button onClick={() => scroll(-1)} className="cat-nav-fade-btn" aria-label="Scroll left">
          <i className="fa-solid fa-chevron-left text-xs"></i>
        </button>
      </div>
      <div ref={box} className="cat-carousel-container" onScroll={update}>
        {cats.map((c, i) => (
          <Link key={c.id} href={`/${c.slug}/`} className="cat-carousel-item group" style={{ padding: "4px 0" }} prefetch={false}>
            <div className="cat-icon-wrapper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.image ? thumbUrl(c.image, 200) : letterImage(c.name)}
                alt={`${c.name} novels`}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%", display: "block" }}
                loading={i >= 4 ? "lazy" : "eager"}
                fetchPriority="low"
                decoding="async"
                width={78}
                height={78}
              />
            </div>
            <span className="cat-title-text">{c.name}</span>
          </Link>
        ))}
      </div>
      <div className="cat-nav-fade-wrap cat-nav-fade-right" style={{ display: right ? "flex" : "none" }}>
        <button onClick={() => scroll(1)} className="cat-nav-fade-btn" aria-label="Scroll right">
          <i className="fa-solid fa-chevron-right text-xs"></i>
        </button>
      </div>
    </div>
  );
}

function BannerSet({ list, kind }: { list: Banner[]; kind: "m" | "d" }) {
  const track = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const hold = useRef(0);
  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => {
      const el = track.current;
      if (!el || document.hidden || Date.now() < hold.current || !root.current?.offsetParent) return;
      setIdx((i) => {
        const n = (i + 1) % list.length;
        el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
        return n;
      });
    }, 4500);
    return () => clearInterval(t);
  }, [list.length]);
  return (
    <div ref={root} className={`kn-banner kn-banner--${kind}`}>
      <div
        ref={track}
        className="kn-banner-track"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
          if (i !== idx && i >= 0 && i < list.length) setIdx(i);
        }}
        onPointerDown={() => (hold.current = Date.now() + 7000)}
        onTouchStart={() => (hold.current = Date.now() + 7000)}
      >
        {list.map((b, i) => {
          // eslint-disable-next-line @next/next/no-img-element
          const img = <img src={mediaUrl(b.img)} alt={`Banner ${i + 1}`} width={b.w || undefined} height={b.h || undefined} loading="lazy" decoding="async" />;
          return (
            <div className="kn-banner-slide" key={i}>
              {b.link ? <a href={b.link}>{img}</a> : img}
            </div>
          );
        })}
      </div>
      {list.length > 1 ? (
        <div className="kn-banner-dots" aria-hidden="true">
          {list.map((_, i) => (
            <span key={i} className={`kn-bdot${i === idx ? " on" : ""}`}></span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Banners({ mobile, desktop }: { mobile: Banner[]; desktop: Banner[] }) {
  if (!mobile.length && !desktop.length) return null;
  return (
    <>
      {mobile.length ? <BannerSet list={mobile} kind="m" /> : null}
      {desktop.length ? <BannerSet list={desktop} kind="d" /> : null}
    </>
  );
}


