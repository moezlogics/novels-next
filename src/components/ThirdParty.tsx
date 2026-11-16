"use client";
import { useEffect } from "react";

/** Google Analytics / LaraPush snippets — injected after first interaction (never on the LCP path). */
export default function ThirdParty({ snippets }: { snippets: string[] }) {
  useEffect(() => {
    const w = window as Window & { __knThirdParty?: boolean };
    let done = false;
    const inject = () => {
      if (done || w.__knThirdParty) return;
      done = true;
      w.__knThirdParty = true;
      snippets.forEach((html) => {
        const wrap = document.createElement("div");
        wrap.innerHTML = html;
        Array.from(wrap.childNodes).forEach((node) => {
          if (node.nodeName === "SCRIPT") {
            const old = node as HTMLScriptElement;
            const s = document.createElement("script");
            if (old.src) s.src = old.src;
            s.async = true;
            s.text = old.textContent || "";
            document.body.appendChild(s);
          } else if (node.nodeType === 1) document.body.appendChild(node);
        });
      });
    };
    const evs = ["pointerdown", "keydown", "scroll", "touchstart"];
    const onAny = () => setTimeout(inject, 500);
    evs.forEach((e) => window.addEventListener(e, onAny, { passive: true, once: true }));
    const t = setTimeout(inject, 12000);
    return () => {
      clearTimeout(t);
      evs.forEach((e) => window.removeEventListener(e, onAny));
    };
  }, [snippets]);
  return null;
}
