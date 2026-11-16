"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { NavItem } from "./Header";

interface Hit {
  title: string;
  writer_name: string;
  link: string;
  img: string;
}

function useLiveSearch(q: string) {
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) {
      setHits(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search/?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: Hit[]) => setHits(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);
  return { hits, loading };
}

/** Desktop: pill search with instant results dropdown (new) — Enter still goes to /search/. */
export function HeaderSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const [active, setActive] = useState(-1);
  const { hits, loading } = useLiveSearch(q);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setFocus(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const open = focus && q.trim().length >= 2;
  return (
    <div ref={wrap} style={{ position: "relative" }}>
      <form
        action="/search/"
        method="GET"
        style={{ display: "flex", alignItems: "center" }}
        onSubmit={(e) => {
          if (active >= 0 && hits?.[active]) {
            e.preventDefault();
            router.push(hits[active].link);
            setFocus(false);
          }
        }}
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <button type="submit" aria-label="Search novels" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 0, cursor: "pointer", color: "rgba(255,255,255,0.6)", zIndex: 1 }}>
            <span className="kn-ico" style={{ width: 13, height: 13 }} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
          </button>
          <input
            type="text"
            name="search"
            placeholder="Search novels..."
            aria-label="Search novels"
            autoComplete="off"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(-1);
            }}
            onFocus={() => setFocus(true)}
            onKeyDown={(e) => {
              if (!hits?.length) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(hits.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(-1, a - 1));
              } else if (e.key === "Escape") setFocus(false);
            }}
            style={{
              height: 36,
              paddingLeft: 34,
              paddingRight: 16,
              fontSize: "0.875rem",
              borderRadius: 9999,
              border: `1px solid ${focus ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.25)"}`,
              background: focus ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.12)",
              color: "#fff",
              outline: "none",
              width: focus ? 220 : 160,
              transition: "width 0.3s ease,background 0.3s ease,border-color 0.3s ease",
            }}
          />
        </div>
      </form>
      {open ? (
        <div className="kn-search-drop" role="listbox">
          {loading && !hits ? <div className="kn-search-empty">Searching…</div> : null}
          {hits && !hits.length ? <div className="kn-search-empty">No results found</div> : null}
          {hits?.map((h, i) => (
            <Link key={h.link} href={h.link} className={`kn-search-item${i === active ? " is-active" : ""}`} onClick={() => setFocus(false)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={h.img} alt="" loading="lazy" />
              <span>
                <b>{h.title}</b>
                <small>{h.writer_name}</small>
              </span>
            </Link>
          ))}
          {hits && hits.length ? (
            <Link href={`/search/?search=${encodeURIComponent(q.trim())}`} className="kn-search-item" style={{ justifyContent: "center", fontSize: ".8rem", fontWeight: 600, color: "var(--theme-secondary)" }} onClick={() => setFocus(false)}>
              See all results →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Mobile: fullscreen glass search with a 3-column cover grid (same as PHP). */
export function MobileSearchButton() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { hits, loading } = useLiveSearch(q);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => input.current?.focus(), 80);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <>
      <button type="button" aria-label="Search" className="lg:hidden text-white hover:text-white/80 transition-colors" onClick={() => setOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <span className="kn-ico text-xl" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
      </button>
      {open ? (
        <div style={{ display: "flex", position: "fixed", inset: 0, zIndex: 200, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", flexDirection: "column", alignItems: "stretch", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #e8edf2", background: "#fff", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <button type="button" aria-label="Close search" onClick={() => setOpen(false)} style={{ background: "none", border: "none", padding: 8, cursor: "pointer", color: "#475569", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
              <i className="fa-solid fa-arrow-left" style={{ fontSize: 17 }}></i>
            </button>
            <form action="/search/" method="GET" style={{ flex: 1, display: "flex", alignItems: "center" }} onSubmit={() => setOpen(false)}>
              <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center" }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: 13, color: "#94a3b8", fontSize: 13, pointerEvents: "none" }} aria-hidden="true"></i>
                <input
                  ref={input}
                  type="text"
                  name="search"
                  placeholder="Search novels, authors..."
                  aria-label="Search novels"
                  autoComplete="off"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  style={{ width: "100%", height: 44, padding: "0 44px 0 38px", fontSize: "0.95rem", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#1e293b", outline: "none", fontFamily: "inherit" }}
                />
                {q ? (
                  <button type="button" aria-label="Clear search" onClick={() => { setQ(""); input.current?.focus(); }} style={{ display: "flex", position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "#e2e8f0", border: "none", borderRadius: "50%", width: 22, height: 22, alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", fontSize: 11 }}>
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                ) : null}
              </div>
            </form>
          </div>
          {q.trim().length < 2 ? (
            <div style={{ padding: "28px 16px 0", color: "#94a3b8", fontSize: "0.82rem", textAlign: "center" }}>
              <i className="fa-solid fa-magnifying-glass" style={{ fontSize: "2rem", color: "#e2e8f0", display: "block", margin: "0 auto 10px" }}></i>
              Type to search novels or authors
            </div>
          ) : null}
          <div style={{ padding: "12px 14px 80px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {loading && !hits ? (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: "0.85rem" }}>
                <i className="fa-solid fa-spinner fa-spin"></i> Searching...
              </div>
            ) : null}
            {hits && !hits.length ? (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: "0.85rem" }}>
                <i className="fa-solid fa-book-open" style={{ fontSize: "1.8rem", color: "#e2e8f0", display: "block", margin: "0 auto 10px" }}></i>No results found
              </div>
            ) : null}
            {hits?.map((h) => (
              <Link key={h.link} href={h.link} onClick={() => setOpen(false)} style={{ display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit" }}>
                <div style={{ aspectRatio: "4/5", borderRadius: 8, overflow: "hidden", background: "#f1f5f9", marginBottom: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={h.img} alt={h.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                </div>
                <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#1e293b", lineHeight: 1.3, margin: "0 0 2px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{h.title}</p>
                <p style={{ fontSize: "0.65rem", color: "#64748b", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.writer_name}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Mobile sidebar drawer (WordPress style). */
export function MobileDrawer({ links, siteName, year, children }: { links: NavItem[]; siteName: string; year: number; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [openSub, setOpenSub] = useState<number | null>(null);

  const open = () => {
    setMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    document.body.style.overflow = "hidden";
  };
  const close = () => {
    setShown(false);
    document.body.style.overflow = "";
    setTimeout(() => setMounted(false), 300);
  };

  return (
    <>
      <button type="button" aria-label="Open menu" className="text-white hover:text-white/80 transition-colors" onClick={open} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        {children}
      </button>
      {mounted ? (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
          <div className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`} onClick={close}></div>
          <div className={`fixed top-0 left-0 bottom-0 w-72 max-w-[80vw] bg-white shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-out ${shown ? "translate-x-0" : "-translate-x-full"}`} style={{ backgroundColor: "#ffffff" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100" style={{ borderColor: "#f1f5f9" }}>
              <span className="text-base font-bold tracking-tight text-slate-900" style={{ color: "#1e293b" }}>
                Menu
              </span>
              <button type="button" aria-label="Close menu" className="h-8 w-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors" onClick={close} style={{ color: "#64748b", border: "none", background: "none", cursor: "pointer" }}>
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <nav className="flex-grow overflow-y-auto py-4 px-3">
              <ul className="space-y-1" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {links.map((link, i) => (
                  <li key={i}>
                    {link.children.length ? (
                      <div>
                        <button type="button" className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all" onClick={() => setOpenSub(openSub === i ? null : i)} style={{ color: "#334155", border: "none", background: "none", textAlign: "left", cursor: "pointer", width: "100%" }}>
                          <span>{link.label}</span>
                          <i className={`fa-solid fa-chevron-down text-xs transition-transform duration-200 ${openSub === i ? "rotate-180" : ""}`} style={{ color: "#64748b" }}></i>
                        </button>
                        <ul className={`space-y-1 pl-4 mt-1 ${openSub === i ? "" : "hidden"}`} style={{ listStyle: "none" }}>
                          {link.children.map((c, j) => (
                            <li key={j}>
                              <Link href={c.url} onClick={close} className="flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all" style={{ color: "#4b5563" }}>
                                └─ {c.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <Link href={link.url} onClick={close} className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all" style={{ color: "#334155" }}>
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
            <div className="p-5 border-t border-slate-100 mt-auto" style={{ borderColor: "#f1f5f9", backgroundColor: "#f8fafc" }}>
              <p className="text-xs text-slate-400 text-center" style={{ margin: 0 }}>
                &copy; {year} {siteName}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
