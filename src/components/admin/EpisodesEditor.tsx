"use client";
import { useState } from "react";

export interface EpisodeLinkIn {
  url: string;
  label?: string;
}
export interface EpisodeIn {
  title: string;
  links: EpisodeLinkIn[];
}

const isDrive = (u: string) => /drive\.google\.com|docs\.google\.com/.test(u);

/**
 * Episodes of a novel (ongoing novels, or a long novel published in parts).
 * Each episode has a title and one or more links: a Google Drive link opens in our
 * reader (and can be downloaded); any other link opens that site (nofollow).
 */
export default function EpisodesEditor({ initial }: { initial: EpisodeIn[] }) {
  const [eps, setEps] = useState<EpisodeIn[]>(initial.length ? initial : []);
  const set = (i: number, e: EpisodeIn) => setEps((all) => all.map((x, k) => (k === i ? e : x)));
  const move = (i: number, d: number) =>
    setEps((all) => {
      const j = i + d;
      if (j < 0 || j >= all.length) return all;
      const next = [...all];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const add = () => setEps((all) => [...all, { title: `Episode ${all.length + 1}`, links: [{ url: "", label: "" }] }]);

  return (
    <div className="a-field">
      <label>Episodes / parts</label>
      <small style={{ display: "block", marginBottom: 8 }}>
        For novels published in episodes. Add as many as you need, each with one or more links. Google Drive links open in the site&apos;s reader; other links open that website (marked nofollow).
      </small>
      <input type="hidden" name="episodes" value={JSON.stringify(eps.map((e) => ({ title: e.title.trim(), links: e.links.filter((l) => l.url.trim()) })).filter((e) => e.links.length))} />
      {eps.map((e, i) => (
        <div key={i} className="a-card" style={{ padding: 12, marginBottom: 10 }}>
          <div className="a-row" style={{ gap: 6, marginBottom: 8 }}>
            <b style={{ minWidth: 26 }}>{i + 1}.</b>
            <input value={e.title} onChange={(ev) => set(i, { ...e, title: ev.target.value })} placeholder={`Episode ${i + 1}`} style={{ flex: 1 }} maxLength={80} aria-label="Episode title" />
            <button type="button" className="a-btn a-btn-g a-btn-xs" onClick={() => move(i, -1)} disabled={i === 0} title="Move up" aria-label="Move up">
              <i className="fa-solid fa-arrow-up"></i>
            </button>
            <button type="button" className="a-btn a-btn-g a-btn-xs" onClick={() => move(i, 1)} disabled={i === eps.length - 1} title="Move down" aria-label="Move down">
              <i className="fa-solid fa-arrow-down"></i>
            </button>
            <button type="button" className="a-btn a-btn-d a-btn-xs" onClick={() => confirm(`Remove “${e.title || `Episode ${i + 1}`}”?`) && setEps((all) => all.filter((_, k) => k !== i))} title="Remove episode" aria-label="Remove episode">
              <i className="fa-solid fa-trash-can"></i>
            </button>
          </div>
          {e.links.map((l, j) => (
            <div key={j} className="a-row" style={{ gap: 6, marginBottom: 6 }}>
              <span className={`a-pill ${l.url ? (isDrive(l.url) ? "ok" : "info") : ""}`} style={{ minWidth: 64, justifyContent: "center" }}>
                {l.url ? (isDrive(l.url) ? "Drive" : "Website") : "Link"}
              </span>
              <input value={l.url} onChange={(ev) => set(i, { ...e, links: e.links.map((x, k) => (k === j ? { ...x, url: ev.target.value } : x)) })} placeholder="https://drive.google.com/file/d/… or any website link" style={{ flex: 3 }} aria-label="Link" />
              <input value={l.label || ""} onChange={(ev) => set(i, { ...e, links: e.links.map((x, k) => (k === j ? { ...x, label: ev.target.value } : x)) })} placeholder="Button text (optional)" style={{ flex: 1.3 }} maxLength={40} aria-label="Button text" />
              {e.links.length > 1 ? (
                <button type="button" className="a-btn a-btn-g a-btn-xs" onClick={() => set(i, { ...e, links: e.links.filter((_, k) => k !== j) })} title="Remove link" aria-label="Remove link">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              ) : null}
            </div>
          ))}
          <button type="button" className="a-btn a-btn-g a-btn-xs" onClick={() => set(i, { ...e, links: [...e.links, { url: "", label: "" }] })}>
            <i className="fa-solid fa-plus"></i> Add another link
          </button>
        </div>
      ))}
      <button type="button" className="a-btn a-btn-g a-btn-sm" onClick={add}>
        <i className="fa-solid fa-plus"></i> Add episode
      </button>
    </div>
  );
}
