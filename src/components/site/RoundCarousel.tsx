"use client";
import Link from "next/link";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { letterImage, thumbUrl } from "@/lib/utils";

export interface RoundItem {
  id: number;
  name: string;
  slug: string;
  image: string;
}

/**
 * Round-icon carousel (categories, writers). Items keep their A–Z order; when `active`
 * is set, that item is highlighted and the row starts at it (earlier items are still
 * there, one swipe to the left). No photo → the first letter of the name.
 */
export default function RoundCarousel({ items, active, label, eager = 4 }: { items: RoundItem[]; active?: string; label: string; eager?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(true);
  const update = useCallback(() => {
    const c = box.current;
    if (!c) return;
    setLeft(c.scrollLeft > 5);
    setRight(c.scrollLeft + c.clientWidth < c.scrollWidth - 5);
  }, []);

  // start the row at the open item, before the first paint
  useLayoutEffect(() => {
    const c = box.current;
    if (c && active) {
      const el = c.querySelector<HTMLElement>('[aria-current="page"]');
      if (el) {
        c.style.scrollBehavior = "auto";
        // a slice of the item before stays visible, so it is clear the row goes both ways
        c.scrollLeft = Math.max(0, el.offsetLeft - c.offsetLeft - 36);
        c.style.scrollBehavior = "";
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [active, update]);

  const scroll = (dir: number) => {
    box.current?.scrollBy({ left: box.current.clientWidth * 0.7 * dir, behavior: "smooth" });
    setTimeout(update, 400);
  };
  if (!items.length) return null;
  return (
    <nav className="relative w-full cat-carousel-wrapper" aria-label={label}>
      <div className="cat-nav-fade-wrap cat-nav-fade-left" style={{ display: left ? "flex" : "none" }}>
        <button type="button" onClick={() => scroll(-1)} className="cat-nav-fade-btn" aria-label="Scroll left">
          <i className="fa-solid fa-chevron-left text-xs"></i>
        </button>
      </div>
      <div ref={box} className="cat-carousel-container" onScroll={update}>
        {items.map((c, i) => {
          const on = c.slug === active;
          return (
            <Link key={c.id} href={`/${c.slug}/`} className={`cat-carousel-item group${on ? " is-active" : ""}`} style={{ padding: "4px 0" }} prefetch={false} aria-current={on ? "page" : undefined}>
              <div className="cat-icon-wrapper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image ? thumbUrl(c.image, 200) : letterImage(c.name)}
                  alt={c.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%", display: "block" }}
                  loading={i >= eager && !on ? "lazy" : "eager"}
                  fetchPriority="low"
                  decoding="async"
                  width={78}
                  height={78}
                />
              </div>
              <span className="cat-title-text">{c.name}</span>
            </Link>
          );
        })}
      </div>
      <div className="cat-nav-fade-wrap cat-nav-fade-right" style={{ display: right ? "flex" : "none" }}>
        <button type="button" onClick={() => scroll(1)} className="cat-nav-fade-btn" aria-label="Scroll right">
          <i className="fa-solid fa-chevron-right text-xs"></i>
        </button>
      </div>
    </nav>
  );
}
