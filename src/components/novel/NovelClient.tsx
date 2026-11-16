"use client";
import { useEffect, useState } from "react";
import Ico from "../Icons";
import { downloadDrive, pdfFilename, type DlProgress } from "@/lib/driveDownload";
import { bumpAffinity } from "@/lib/readerStore";
import { readerCommand, type DlInfo, type ReaderSpec } from "@/lib/readerBus";



/** Is it OK to load the reader in the background on this connection? */
function canPreload() {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !(c?.saveData || /(^|-)2g$/.test(c?.effectiveType || ""));
}

export function ReadButton({ pid, driveId, title, totalPages, cover, dl, preload = true }: { pid: number; driveId: string; title: string; totalPages: number; cover: string; dl?: DlInfo; preload?: boolean }) {
  // the reader itself lives in the site layout (ReaderHost) so it keeps its place across pages
  const spec = (): ReaderSpec => ({ key: `${pid}:main`, pid, items: [{ label: title, driveId }], title, cover, totalPages, dl });
  const warm = () => readerCommand("preload", spec());

  useEffect(() => {
    if (new URLSearchParams(location.search).get("read") === "1") {
      readerCommand("open", spec());
      return;
    }
    // Most visitors of a novel page read it, so Google's viewer is loaded early — but only
    // after the page is on screen and the visitor starts using it (first touch, scroll or
    // key), so its heavy scripts never slow the novel page itself. Touching "Read" also
    // starts it. Skipped on data-saver / 2G connections.
    if (!preload || !canPreload()) return;
    const evs = ["pointerdown", "touchstart", "scroll", "keydown", "mousemove"] as const;
    let fired = false;
    const go = () => {
      if (fired) return;
      fired = true;
      evs.forEach((e) => window.removeEventListener(e, go));
      setTimeout(warm, 400);
    };
    evs.forEach((e) => window.addEventListener(e, go, { passive: true, once: true }));
    return () => evs.forEach((e) => window.removeEventListener(e, go));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid, preload]);

  return (
    <button type="button" className="sp-btn sp-btn-read" aria-label={`Read Online Free: ${title}`} onPointerEnter={warm} onTouchStart={warm} onFocus={warm} onClick={() => readerCommand("open", spec())}>
      <Ico name="read" /> Read Online Free
    </button>
  );
}

export interface EpisodeView {
  title: string;
  links: { url: string; label: string; driveId: string }[];
}

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "website";
  }
};

/** Episodes: Drive links open in the site's reader (with an episode switcher); other links open that site (nofollow). */
export function EpisodeList({ pid, title, cover, episodes, dl, downloads = true }: { pid: number; title: string; cover: string; episodes: EpisodeView[]; dl?: DlInfo; downloads?: boolean }) {
  // every Drive link becomes one reader item, named after its episode
  const items: { label: string; driveId: string }[] = [];
  for (const e of episodes) {
    const drive = e.links.filter((l) => l.driveId);
    drive.forEach((l, j) => items.push({ label: drive.length > 1 ? `${e.title} (${l.label || j + 1})` : e.title, driveId: l.driveId }));
  }
  const open = (driveId: string) =>
    readerCommand("open", { key: `${pid}:ep`, pid, items, start: Math.max(0, items.findIndex((x) => x.driveId === driveId)), title, cover, totalPages: 0, dl: { site: dl?.site } });
  return (
    <section className="sp-episodes" aria-label="Episodes">
      <h2 className="sp-episodes-title">
        <Ico name="read" /> Episodes <span>({episodes.length})</span>
      </h2>
      <ol className="sp-episode-list">
        {episodes.map((e, i) => (
          <li key={i} className="sp-episode">
            <span className="sp-episode-no">{i + 1}</span>
            <span className="sp-episode-name">{e.title}</span>
            <span className="sp-episode-actions">
              {e.links.map((l, j) =>
                l.driveId ? (
                  <span key={j} style={{ display: "contents" }}>
                    <button type="button" className="sp-ep-btn sp-ep-read" onPointerEnter={() => readerCommand("preload", { key: `${pid}:ep`, pid, items, title, cover, totalPages: 0 })} onClick={() => open(l.driveId)}>
                      <Ico name="read" /> {l.label || "Read"}
                    </button>
                    {downloads ? (
                      <button type="button" className="sp-ep-btn sp-ep-dl" aria-label={`Download ${e.title}`} title="Download PDF" onClick={() => void downloadDrive({ driveId: l.driveId, filename: pdfFilename(`${title} ${e.title}`, dl?.site || "") })}>
                        <Ico name="download" />
                      </button>
                    ) : null}
                  </span>
                ) : (
                  <a key={j} className="sp-ep-btn sp-ep-ext" href={l.url} target="_blank" rel="nofollow noopener noreferrer">
                    <Ico name="read" /> {l.label || `Read on ${host(l.url)}`}
                  </a>
                ),
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const mb = (b: number) => (b / 1048576).toFixed(b > 10485760 ? 0 : 1);

export function DownloadButton({ pid, driveId, title, dl }: { pid: number; driveId: string; title: string; dl?: DlInfo }) {
  const [state, setState] = useState<"" | "starting" | "loading" | "waiting" | "done" | "error">("");
  const [prog, setProg] = useState<DlProgress | null>(null);
  const start = async () => {
    if (state && state !== "done" && state !== "error") return;
    setState("starting");
    setProg(null);
    fetch("/api/track/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: pid, ev: "download" }), keepalive: true }).catch(() => {});
    try {
      const how = await downloadDrive({
        driveId,
        apiKey: dl?.apiKey,
        size: dl?.size,
        filename: pdfFilename(title, dl?.site || ""),
        onProgress: (p) => {
          setState("loading");
          setProg(p);
        },
      });
      if (how === "browser") {
        // Google prepares big files before sending them; tell the reader instead of looking stuck
        setState("waiting");
        setTimeout(() => setState((s) => (s === "waiting" ? "" : s)), 15000);
      } else {
        setState("done");
        setTimeout(() => setState((s) => (s === "done" ? "" : s)), 5000);
      }
    } catch {
      setState("error");
    }
  };
  const pct = prog && prog.total ? Math.min(100, Math.round((prog.loaded / prog.total) * 100)) : 0;
  const text =
    state === "starting"
      ? "Starting download…"
      : state === "loading"
        ? prog?.total
          ? `Downloading ${pct}% · ${mb(prog.loaded)} / ${mb(prog.total)} MB`
          : `Downloading… ${mb(prog?.loaded || 0)} MB`
        : state === "waiting"
          ? "Google Drive is preparing your file (5–15 seconds)…"
          : state === "done"
            ? "Downloaded ✓ Check your Downloads"
            : state === "error"
              ? "Download failed. Tap to try again"
              : `Download Free${dl?.size ? ` (${mb(dl.size)} MB)` : ""}`;
  return (
    <button
      type="button"
      className={`sp-btn sp-btn-dl${state === "starting" || state === "loading" ? " is-downloading" : ""}`}
      style={{ "--download-progress": `${pct}%` } as React.CSSProperties}
      onClick={start}
      aria-live="polite"
    >
      <Ico name="download" /> <span className="dl-text">{text}</span>
    </button>
  );
}

/** View counter + guest category affinity (after paint, never blocks render). */
export function NovelTracker({ id, catId }: { id: number; catId: number }) {
  useEffect(() => {
    const run = () => {
      bumpAffinity(catId);
      try {
        const k = `kn_v_${id}`;
        if (sessionStorage.getItem(k)) return;
        sessionStorage.setItem(k, "1");
      } catch {}
      fetch("/api/track/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ev: "view" }), keepalive: true }).catch(() => {});
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 1500);
  }, [id, catId]);
  return null;
}
