"use client";
import { useEffect, useState } from "react";
import { useMe } from "../useMe";

/** One view per product per browser session (feeds seller stats). */
export function ViewBeacon({ id }: { id: number }) {
  useEffect(() => {
    const k = `kn_pv_${id}`;
    try {
      if (sessionStorage.getItem(k)) return;
    } catch {}
    // mark as counted only when it is really sent (effects can run twice)
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(k, "1");
      } catch {}
      fetch("/api/shop/view/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }), keepalive: true }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [id]);
  return null;
}

export function ReviewForm({ productId }: { productId: number }) {
  const me = useMe();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!me) return null;
  if (!me.member)
    return (
      <p style={{ fontSize: ".88rem" }}>
        <a href={`/login/?return=${encodeURIComponent(typeof location !== "undefined" ? location.pathname : "/shop/")}`}>Log in</a> to write a review.
      </p>
    );
  if (msg?.ok) return <div className="shop-alert shop-alert-ok">{msg.t}</div>;
  return (
    <form
      className="shop-review-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const d = await fetch("/api/shop/review/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: productId, rating, text }) })
          .then((r) => r.json())
          .catch(() => ({ error: "Network error. Try again." }));
        setBusy(false);
        setMsg(d.ok ? { ok: true, t: d.message || "Thank you! Your review is saved." } : { ok: false, t: d.error || "Could not save the review." });
      }}
    >
      <div className="shop-rate" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((i) => (
          <button type="button" key={i} role="radio" aria-checked={rating === i} aria-label={`${i} star${i > 1 ? "s" : ""}`} onClick={() => setRating(i)}>
            <i className={`fa-${rating >= i ? "solid" : "regular"} fa-star`}></i>
          </button>
        ))}
      </div>
      <textarea className="shop-form-control" rows={3} maxLength={1000} required value={text} onChange={(e) => setText(e.target.value)} placeholder="How was the book and the delivery?" />
      {msg && !msg.ok ? <div className="shop-alert shop-alert-err">{msg.t}</div> : null}
      <button className="sp-submit" disabled={busy} style={{ marginTop: 8 }}>
        {busy ? "Saving…" : "Post review"}
      </button>
    </form>
  );
}
