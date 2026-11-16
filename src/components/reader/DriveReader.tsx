"use client";
import "@/styles/drive-reader.css";
import { useEffect, useState } from "react";
import { getPrefs, savePrefs, type ReaderPrefs } from "@/lib/readerStore";
import { drivePreviewUrl } from "@/lib/pdfConst";

/**
 * Reader = Google Drive's own PDF viewer inside our reader screen.
 * Google renders the pages on its own servers (same as the Kitab Nagri app),
 * so it is fast for millions of readers and costs our server nothing.
 * It is Google's official embed. Google's "open in new window" button is covered and
 * links inside the PDF are blocked, so readers stay on our site.
 * It is mounted invisibly before the reader taps "Read", so it opens instantly.
 * Very big novels are split into parts (Google's viewer fails on huge PDFs);
 * the reader shows Part 1 / Part 2 … buttons for them.
 */

interface Props {
  pid: number;
  driveIds: string[]; // Part 1, Part 2, …
  title: string;
  cover: string;
  totalPages: number;
  visible: boolean;
  onClose: () => void;
  onDownload?: (driveId: string) => void;
}

const THEMES: { k: ReaderPrefs["theme"]; label: string; cls: string; sw: string }[] = [
  { k: "classic", label: "Classic", cls: "classic", sw: "#ffffff" },
  { k: "sepia", label: "Sepia", cls: "sepia", sw: "#f4ecd8" },
  { k: "dark", label: "Night", cls: "night", sw: "#111827" },
];

export default function DriveReader({ pid, driveIds, title, cover, totalPages, visible, onClose, onDownload }: Props) {
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => getPrefs());
  const [nonce, setNonce] = useState(0);
  const [focus, setFocus] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [part, setPart] = useState(0);
  const driveId = driveIds[part] || driveIds[0];
  const multi = driveIds.length > 1;


  const close = () => {
    if (location.hash === "#read") history.back();
    else onClose();
  };

  // open / close: phone back button, Esc, keep the screen awake
  useEffect(() => {
    if (!visible) return;
    document.body.classList.add("reader-open");
    if (location.hash !== "#read") history.pushState(history.state, "", `${location.pathname}${location.search}#read`);
    fetch("/api/track/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: pid, ev: "read" }), keepalive: true }).catch(() => {});
    const onPop = () => {
      if (location.hash === "#read") return;
      setSheet(false);
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSheet((open) => {
        if (!open) {
          if (location.hash === "#read") history.back();
          else onClose();
        }
        return false;
      });
    };
    window.addEventListener("popstate", onPop);
    document.addEventListener("keydown", onKey);

    type WL = { release: () => Promise<void> };
    let lock: WL | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WL> } };
    const wake = () => nav.wakeLock && document.visibilityState === "visible" && nav.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {});
    wake();
    document.addEventListener("visibilitychange", wake);
    return () => {
      document.body.classList.remove("reader-open");
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", wake);
      lock?.release().catch(() => {});
    };
  }, [visible, pid, onClose]);

  const update = (p: Partial<ReaderPrefs>) => {
    const next = { ...prefs, ...p };
    setPrefs(next);
    savePrefs(next);
  };

  const openPart = (i: number) => {
    if (i === part) return;
    setPart(i);
    setNonce((n) => n + 1);
  };

  const theme = THEMES.find((t) => t.k === prefs.theme)?.cls || "classic";

  return (
    <div className={`dr dr-theme-${theme}${focus ? " dr-focus" : ""}${visible ? "" : " dr-hidden"}`} role="dialog" aria-label={`Reading ${title}`} aria-hidden={!visible} inert={!visible}>
      <header className="dr-top">
        <button className="dr-btn" onClick={close} aria-label="Close reader" title="Close (Esc)">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="dr-title">
          <b>{title}</b>
          <small>{multi ? `Part ${part + 1} of ${driveIds.length}` : totalPages ? `${totalPages} pages` : "Read online"}</small>
        </div>
        <button className="dr-btn" onClick={() => setFocus(true)} title="Focus mode: hide this bar" aria-label="Focus mode">
          <i className="fa-solid fa-eye-slash"></i>
          <span className="dr-hide-sm">Focus</span>
        </button>
        <button className="dr-btn" onClick={() => setSheet(true)} title="Reading settings" aria-label="Reading settings">
          <i className="fa-solid fa-sliders"></i>
        </button>
      </header>
      {multi ? (
        <nav className="dr-parts" aria-label="Parts">
          {driveIds.map((_, i) => (
            <button key={i} className={i === part ? "on" : ""} aria-current={i === part ? "true" : undefined} onClick={() => openPart(i)}>
              Part {i + 1}
            </button>
          ))}
        </nav>
      ) : null}

      <div className="dr-stage">
        {/* Google's official embed, exactly as on any site: fastest for every size of PDF */}
        {/* sandbox without "allow-popups": links inside the PDF cannot open new tabs or other sites */}
        <iframe key={nonce} className="dr-frame" src={drivePreviewUrl(driveId)} title={title} allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin" />
        {/* covers Google's "open in new window" button, so readers stay on our site */}
        <div className="dr-shield" aria-hidden="true" />
        <div className="dr-dim" style={{ opacity: 1 - prefs.brightness }} />
        <button className="dr-pill" onClick={() => setFocus(false)} aria-label="Show controls" title="Show controls">
          <i className="fa-solid fa-eye"></i>
        </button>
      </div>

      {sheet ? (
        <>
          <div className="dr-sheet-bg" onClick={() => setSheet(false)} />
          <div className="dr-sheet" role="dialog" aria-label="Reading settings">
            <h4>Theme</h4>
            <div className="dr-row">
              {THEMES.map((t) => (
                <button key={t.k} className={`dr-chip${prefs.theme === t.k ? " is-on" : ""}`} onClick={() => update({ theme: t.k })}>
                  <span className="dr-sw" style={{ background: t.sw }} />
                  {t.label}
                </button>
              ))}
            </div>
            <h4>Brightness</h4>
            <div className="dr-range">
              <i className="fa-regular fa-sun"></i>
              <input type="range" min={0.4} max={1} step={0.05} value={prefs.brightness} onChange={(e) => update({ brightness: +e.target.value })} aria-label="Brightness" />
              <i className="fa-solid fa-sun"></i>
            </div>
            <div className="dr-row">
              {onDownload ? (
                <button className="dr-chip" onClick={() => onDownload(driveId)}>
                  <i className="fa-solid fa-download"></i>
                  {multi ? `Download Part ${part + 1}` : "Download PDF"}
                </button>
              ) : null}
            </div>
            <h4>Tips</h4>
            <ul className="dr-tips">
              <li>Jump to a page: tap the page number at the bottom of the novel and type the page.</li>
              <li>Zoom: pinch with two fingers, or use + / − at the bottom.</li>
              <li>Tap the eye button to hide this bar while reading.</li>
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
