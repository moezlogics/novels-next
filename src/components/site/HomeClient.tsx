"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Banner } from "@/lib/types";
import { mediaUrl } from "@/lib/utils";

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


