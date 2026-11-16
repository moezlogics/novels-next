"use client";
import { useState } from "react";

export default function ContactForm() {
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    try {
      const r = await fetch("/api/contact/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const d = await r.json();
      setMsg({ type: d.type || (r.ok ? "ok" : "err"), text: d.message || d.error });
      if (r.ok && d.type === "ok") form.reset();
    } catch {
      setMsg({ type: "err", text: "Something went wrong. Please try again later." });
    }
    setBusy(false);
  };
  return (
    <>
      {msg ? (
        <div className={`static-alert static-alert--${msg.type}`}>
          <i className={`fa-solid ${msg.type === "ok" ? "fa-circle-check" : msg.type === "warn" ? "fa-circle-exclamation" : "fa-triangle-exclamation"}`}></i> {msg.text}
        </div>
      ) : null}
      <form onSubmit={submit} className="contact-form">
        <div className="contact-form-grid">
          <div>
            <label htmlFor="cName">Full Name</label>
            <input type="text" id="cName" name="name" required placeholder="Your name" maxLength={120} />
          </div>
          <div>
            <label htmlFor="cEmail">Email Address</label>
            <input type="email" id="cEmail" name="email" required placeholder="you@example.com" maxLength={160} />
          </div>
        </div>
        <div className="contact-form-field">
          <label htmlFor="cSubject">Subject</label>
          <input type="text" id="cSubject" name="subject" required placeholder="How can we help?" maxLength={200} />
        </div>
        <div className="contact-form-field">
          <label htmlFor="cMessage">Message</label>
          <textarea id="cMessage" name="message" rows={5} required placeholder="Write your message here..." maxLength={5000}></textarea>
        </div>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: -9999 }} aria-hidden="true" />
        <button type="submit" className="btn-brand contact-submit" disabled={busy}>
          <i className="fa-solid fa-paper-plane"></i> {busy ? "Sending…" : "Send Message"}
        </button>
      </form>
    </>
  );
}
