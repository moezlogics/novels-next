"use client";
import { useEffect, useRef } from "react";

/** WhatsApp logo from the site's icon set (no extra download). */
export function WhatsAppGlyph({ className = "" }: { className?: string }) {
  return <i className={`fa-brands fa-whatsapp ${className}`} aria-hidden="true"></i>;
}

const KEY = "kn_wa_y"; // where the reader left the button (fraction of the screen height)

/**
 * Floating "Join Channel" button, stuck to the right edge. Drag it up or down to move it
 * out of the way; the place is remembered on this device. A tap opens the channel.
 */
export default function WhatsAppFab({ url }: { url: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const drag = useRef({ on: false, moved: false, y0: 0, top0: 0, id: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const clamp = (top: number) => {
      const bottomGap = window.innerWidth < 1024 ? 72 : 12; // keep clear of the phone tab bar
      return Math.min(Math.max(60, top), window.innerHeight - el.offsetHeight - bottomGap);
    };
    const place = () => {
      let f = NaN;
      try {
        f = parseFloat(localStorage.getItem(KEY) || "");
      } catch {}
      if (f >= 0 && f <= 1) {
        el.style.top = `${clamp(f * window.innerHeight)}px`;
        el.style.bottom = "auto";
      }
    };
    place();
    window.addEventListener("resize", place);

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      drag.current = { on: true, moved: false, y0: e.clientY, top0: el.getBoundingClientRect().top, id: e.pointerId };
    };
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d.on || e.pointerId !== d.id) return;
      const dy = e.clientY - d.y0;
      if (!d.moved && Math.abs(dy) < 6) return;
      if (!d.moved) {
        d.moved = true;
        el.setPointerCapture(e.pointerId);
        el.classList.add("is-drag");
      }
      e.preventDefault();
      el.style.top = `${clamp(d.top0 + dy)}px`;
      el.style.bottom = "auto";
    };
    const up = (e: PointerEvent) => {
      const d = drag.current;
      if (!d.on || e.pointerId !== d.id) return;
      d.on = false;
      el.classList.remove("is-drag");
      if (d.moved) {
        try {
          localStorage.setItem(KEY, String(el.getBoundingClientRect().top / window.innerHeight));
        } catch {}
      }
    };
    // a drag is not a tap: don't open the channel after moving the button
    const click = (e: MouseEvent) => {
      if (drag.current.moved) {
        e.preventDefault();
        drag.current.moved = false;
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("click", click);
    return () => {
      window.removeEventListener("resize", place);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click);
    };
  }, []);

  if (!url) return null;
  return (
    <a ref={ref} href={url} target="_blank" rel="noopener" className="kn-wa-fab" aria-label="Join our WhatsApp Channel (drag to move)" draggable={false}>
      <svg className="kn-wa-ring" viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          {/* full circle, starting at the bottom and going up the left side */}
          <path id="kn-wa-arc" d="M60,103 A43,43 0 1,1 60.01,103" />
        </defs>
        <text textAnchor="middle">
          <textPath href="#kn-wa-arc" startOffset="50%">
            JOIN CHANNEL
          </textPath>
        </text>
      </svg>
      <span className="kn-wa-dot">
        <WhatsAppGlyph />
      </span>
    </a>
  );
}
