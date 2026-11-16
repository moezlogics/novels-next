"use client";
import { useState } from "react";
import { Submit } from "./Fields";

type P = { id: number; title: string; img: string };

export default function FamousPicker({ all, selected }: { all: P[]; selected: number[] }) {
  const [sel, setSel] = useState<number[]>(selected.filter((id) => all.some((p) => p.id === id)));
  const [q, setQ] = useState("");
  const byId = new Map(all.map((p) => [p.id, p]));
  const move = (i: number, d: number) =>
    setSel((s) => {
      const n = [...s];
      const j = i + d;
      if (j < 0 || j >= n.length) return s;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  return (
    <div className="a-grid a-g2">
      <div>
        <label className="a-label">Selected ({sel.length}/24) — shown in this order</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {sel.map((id, i) => {
            const p = byId.get(id)!;
            return (
              <div key={id} className="a-row" style={{ flexWrap: "nowrap", padding: 6, border: "1px solid rgba(255,255,255,.1)", borderRadius: 10 }}>
                <b className="a-muted" style={{ width: 22 }}>
                  {i + 1}
                </b>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" style={{ width: 30, height: 44, objectFit: "cover", borderRadius: 4 }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: ".86rem" }}>{p.title}</span>
                <button type="button" className="a-btn a-btn-g a-btn-xs" onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button type="button" className="a-btn a-btn-g a-btn-xs" onClick={() => move(i, 1)}>
                  ↓
                </button>
                <button type="button" className="a-btn a-btn-d a-btn-xs" onClick={() => setSel((s) => s.filter((x) => x !== id))}>
                  ✕
                </button>
              </div>
            );
          })}
          {!sel.length ? <div className="a-empty">Pick novels from the right →</div> : null}
        </div>
        <input type="hidden" name="ids" value={sel.join(",")} />
        <div style={{ marginTop: 14 }}>
          <Submit>
            <i className="fa-solid fa-floppy-disk"></i> Save
          </Submit>
        </div>
      </div>
      <div>
        <input type="search" placeholder="Search novels…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div style={{ maxHeight: 520, overflowY: "auto", marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {all
            .filter((p) => !sel.includes(p.id) && p.title.toLowerCase().includes(q.toLowerCase()))
            .map((p) => (
              <button type="button" key={p.id} className="a-row" disabled={sel.length >= 24} onClick={() => setSel((s) => [...s, p.id])} style={{ flexWrap: "nowrap", padding: 6, border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, background: "transparent", color: "#fff", cursor: "pointer", textAlign: "left" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" style={{ width: 30, height: 44, objectFit: "cover", borderRadius: 4 }} />
                <span style={{ flex: 1, fontSize: ".86rem" }}>{p.title}</span>
                <i className="fa-solid fa-plus" style={{ color: "var(--a-acc)" }}></i>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
