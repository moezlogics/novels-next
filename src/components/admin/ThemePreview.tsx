"use client";
import { useState } from "react";

const PRESETS = [
  { n: "Kitab Pink", p: "#e75480", s: "#d6336c", h: "#fbbf24" },
  { n: "Royal Blue", p: "#0f2c5c", s: "#1a56db", h: "#fbbf24" },
  { n: "Emerald", p: "#064e3b", s: "#059669", h: "#facc15" },
  { n: "Teal", p: "#004d5e", s: "#0e7490", h: "#f59e0b" },
  { n: "Purple", p: "#3b0764", s: "#7c3aed", h: "#f472b6" },
  { n: "Charcoal", p: "#111827", s: "#ef4444", h: "#fbbf24" },
];

export default function ThemePreview({ primary, secondary, hover }: { primary: string; secondary: string; hover: string }) {
  const [p, setP] = useState(primary);
  const [s, setS] = useState(secondary);
  const [h, setH] = useState(hover);
  return (
    <>
      <div className="a-row" style={{ marginBottom: 14 }}>
        {PRESETS.map((x) => (
          <button
            type="button"
            key={x.n}
            className="a-btn a-btn-g a-btn-sm"
            onClick={() => {
              setP(x.p);
              setS(x.s);
              setH(x.h);
            }}
          >
            <span style={{ width: 14, height: 14, borderRadius: 4, background: x.p }} />
            <span style={{ width: 14, height: 14, borderRadius: 4, background: x.s }} />
            {x.n}
          </button>
        ))}
      </div>
      <div className="a-grid a-g3">
        {[
          ["theme_primary", "Primary (header / footer)", p, setP],
          ["theme_secondary", "Secondary (buttons / links)", s, setS],
          ["theme_hover", "Hover / accent", h, setH],
        ].map(([name, label, val, set]) => (
          <div className="a-field" key={name as string}>
            <label>{label as string}</label>
            <div className="a-row" style={{ flexWrap: "nowrap" }}>
              <input type="color" value={val as string} onChange={(e) => (set as (v: string) => void)(e.target.value)} />
              <input type="text" name={name as string} value={val as string} onChange={(e) => (set as (v: string) => void)(e.target.value)} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)", background: "#fff", color: "#1e293b" }}>
        <div style={{ background: p, color: "#fff", padding: "10px 16px", display: "flex", alignItems: "center", gap: 16, fontWeight: 700 }}>
          Kitab Nagri <span style={{ marginLeft: "auto", fontWeight: 500, fontSize: ".85rem", opacity: 0.85 }}>Home · Shop · About · Contact</span>
        </div>
        <div style={{ padding: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 54, height: 54, borderRadius: "50%", boxShadow: `0 0 0 2px #f8fafc, 0 0 0 3.5px ${s}`, background: "#f1f5f9" }} />
          <button type="button" style={{ background: s, color: "#fff", border: 0, borderRadius: 8, padding: "9px 18px", fontWeight: 700 }}>
            Read Online Free
          </button>
          <a style={{ color: s, fontWeight: 700 }}>Writer link</a>
          <span style={{ background: h, color: p, borderRadius: 999, padding: "6px 14px", fontWeight: 700 }}>Hover state</span>
        </div>
      </div>
    </>
  );
}
