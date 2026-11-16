"use client";
import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: { accounts: { id: { initialize: (o: object) => void; renderButton: (el: HTMLElement, o: object) => void } } };
  }
}

const GOOGLE_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

function useAuthSubmit(returnUrl: string) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const run = async (endpoint: string, body: object) => {
    setError("");
    setLoading(true);
    try {
      const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, return_url: returnUrl }) });
      const d = await r.json();
      if (!r.ok || d.status !== "success") throw new Error(d.error || "Something went wrong. Please try again.");
      window.location.href = d.redirect || "/account/";
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };
  return { error, loading, run, setError };
}

function GoogleButton({ text, onCredential }: { text: "signin_with" | "signup_with"; onCredential: (c: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!ready || !ref.current || !window.google) return;
    window.google.accounts.id.initialize({ client_id: GOOGLE_ID, callback: (r: { credential: string }) => onCredential(r.credential), ux_mode: "popup" });
    window.google.accounts.id.renderButton(ref.current, { theme: "outline", size: "large", text, shape: "pill", width: Math.min(360, ref.current.clientWidth || 320) });
  }, [ready, text, onCredential]);
  if (!GOOGLE_ID) return null;
  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setReady(true)} />
      <div className="auth-divider">or</div>
      <div className="auth-google-wrap">
        <div ref={ref}></div>
      </div>
    </>
  );
}

function Password({ id, name, placeholder, auto }: { id: string; name: string; placeholder: string; auto: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="auth-password-wrap">
      <input type={show ? "text" : "password"} id={id} name={name} autoComplete={auto} required minLength={8} placeholder={placeholder} />
      <button type="button" className="auth-toggle-pw" aria-label="Show password" onClick={() => setShow((s) => !s)}>
        <i className={`fa-regular ${show ? "fa-eye-slash" : "fa-eye"}`}></i>
      </button>
    </div>
  );
}

export function LoginForm({ returnUrl }: { returnUrl: string }) {
  const { error, loading, run } = useAuthSubmit(returnUrl);
  return (
    <div className="auth-card">
      {error ? (
        <div className="auth-error show" role="alert">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="auth-loading show">
          <div className="acct-spinner"></div> Signing you in…
        </div>
      ) : null}
      <form
        className="auth-email-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          run("/api/auth/login/", { email: f.get("email"), password: f.get("password") });
        }}
      >
        <div className="acct-field">
          <label htmlFor="loginEmail">Email</label>
          <input type="email" id="loginEmail" name="email" autoComplete="email" required placeholder="you@example.com" />
        </div>
        <div className="acct-field">
          <label htmlFor="loginPassword">Password</label>
          <Password id="loginPassword" name="password" placeholder="Your password" auto="current-password" />
        </div>
        <button type="submit" className="acct-btn acct-btn-primary auth-submit-btn" disabled={loading}>
          Sign In
        </button>
      </form>
      <GoogleButton text="signin_with" onCredential={(c) => run("/api/auth/google/", { credential: c })} />
      <p className="auth-switch">
        New here? <Link href={`/register/${returnUrl ? `?return=${encodeURIComponent(returnUrl)}` : ""}`}>Create an account</Link>
      </p>
    </div>
  );
}

export function RegisterForm({ returnUrl }: { returnUrl: string }) {
  const { error, loading, run } = useAuthSubmit(returnUrl);
  return (
    <div className="auth-card">
      {error ? (
        <div className="auth-error show" role="alert">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="auth-loading show">
          <div className="acct-spinner"></div> Creating your account…
        </div>
      ) : null}
      <form
        className="auth-email-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = Object.fromEntries(new FormData(e.currentTarget));
          run("/api/auth/register/", f);
        }}
      >
        <div className="acct-field">
          <label htmlFor="regName">Display name</label>
          <input type="text" id="regName" name="name" autoComplete="name" required maxLength={80} placeholder="e.g. Ali Khan" />
        </div>
        <div className="acct-field">
          <label htmlFor="regEmail">Email</label>
          <input type="email" id="regEmail" name="email" autoComplete="email" required placeholder="you@example.com" />
        </div>
        <div className="acct-field">
          <label htmlFor="regPhone">
            Mobile number <span style={{ fontWeight: 500, color: "#94a3b8" }}>(optional)</span>
          </label>
          <input type="tel" id="regPhone" name="phone" autoComplete="tel" maxLength={20} placeholder="e.g. 03001234567" />
        </div>
        <div className="acct-field">
          <label htmlFor="regPassword">Password</label>
          <Password id="regPassword" name="password" placeholder="At least 8 characters" auto="new-password" />
        </div>
        <div className="acct-field">
          <label htmlFor="regPasswordConfirm">Confirm password</label>
          <Password id="regPasswordConfirm" name="password_confirm" placeholder="Repeat password" auto="new-password" />
        </div>
        <button type="submit" className="acct-btn acct-btn-primary auth-submit-btn" disabled={loading}>
          Create Account
        </button>
      </form>
      <GoogleButton text="signup_with" onCredential={(c) => run("/api/auth/google/", { credential: c })} />
      <p className="auth-switch">
        Already have an account? <Link href={`/login/${returnUrl ? `?return=${encodeURIComponent(returnUrl)}` : ""}`}>Sign in</Link>
      </p>
    </div>
  );
}
