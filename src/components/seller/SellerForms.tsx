"use client";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { sellerLogin, sellerRegister, sellerSaveAccount, type FormState } from "@/app/seller/actions";

export function Errors({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.errors?.length)
    return (
      <div className="sl-alert err" role="alert">
        <b>Please fix this:</b>
        <ul>
          {state.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
    );
  if (state.ok)
    return (
      <div className="sl-alert ok" role="status">
        {state.ok}
      </div>
    );
  return null;
}

export function SubmitBtn({ children, className = "sl-btn block", pending = "Please wait…" }: { children: React.ReactNode; className?: string; pending?: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button className={className} disabled={busy}>
      {busy ? (
        <>
          <i className="fa-solid fa-spinner fa-spin"></i> {pending}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(sellerLogin, null);
  return (
    <form action={action}>
      <Errors state={state} />
      <div className="sl-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} />
      </div>
      <div className="sl-field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <SubmitBtn pending="Logging in…">
        <i className="fa-solid fa-right-to-bracket"></i> Log in
      </SubmitBtn>
    </form>
  );
}

export function RegisterForm({ terms }: { terms: string }) {
  const [state, action] = useActionState(sellerRegister, null);
  const v = state?.values || {};
  return (
    <form action={action}>
      <Errors state={state} />
      <div className="sl-grid sl-g2">
        <div className="sl-field">
          <label htmlFor="name">Your full name</label>
          <input id="name" name="name" autoComplete="name" required defaultValue={v.name} />
        </div>
        <div className="sl-field">
          <label htmlFor="store_name">Store / pen name</label>
          <input id="store_name" name="store_name" required defaultValue={v.store_name} placeholder="e.g. Areej Rao Books" />
        </div>
      </div>
      <div className="sl-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={v.email} />
      </div>
      <div className="sl-grid sl-g2">
        <div className="sl-field">
          <label htmlFor="phone">Mobile number</label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required defaultValue={v.phone} placeholder="03xx xxxxxxx" />
          <small>Private. Only the admin sees it.</small>
        </div>
        <div className="sl-field">
          <label htmlFor="city">City</label>
          <input id="city" name="city" autoComplete="address-level2" defaultValue={v.city} placeholder="Lahore" />
        </div>
      </div>
      <div className="sl-grid sl-g2">
        <div className="sl-field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <div className="sl-field">
          <label htmlFor="password2">Repeat password</label>
          <input id="password2" name="password2" type="password" autoComplete="new-password" minLength={8} required />
        </div>
      </div>
      <input name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px" }} aria-hidden="true" />
      <details className="sl-card" style={{ padding: 12, background: "#f8fafc" }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Seller rules (please read)</summary>
        <div className="sl-small sl-muted" style={{ whiteSpace: "pre-line", marginTop: 8 }}>
          {terms ||
            "• Sell only printed books you have the right to sell.\n• No phone numbers, WhatsApp, emails, social handles or links anywhere in your listings or store. Buyers order through the website and pay cash on delivery.\n• Ship orders within your processing time and add the courier tracking number.\n• No commission: you keep 100% of the price.\n• Spam, fake listings or contact details lead to suspension."}
        </div>
      </details>
      <label className="sl-check">
        <input type="checkbox" name="terms" value="1" required /> I accept the seller rules.
      </label>
      <SubmitBtn pending="Creating account…">
        <i className="fa-solid fa-store"></i> Create seller account
      </SubmitBtn>
      <p className="sl-small sl-muted" style={{ textAlign: "center", marginTop: 12 }}>
        Already selling? <Link href="/seller/login/">Log in</Link>
      </p>
    </form>
  );
}

export function AccountForm({ name, phone, email, asAdmin }: { name: string; phone: string; email: string; asAdmin: boolean }) {
  const [state, action] = useActionState(sellerSaveAccount, null);
  return (
    <form action={action}>
      <Errors state={state} />
      <div className="sl-card">
        <h2>
          <i className="fa-solid fa-user"></i> Your details
        </h2>
        <div className="sl-field">
          <label>Email (login)</label>
          <input value={email} disabled readOnly />
          <small>To change your login email, contact the admin.</small>
        </div>
        <div className="sl-grid sl-g2">
          <div className="sl-field">
            <label htmlFor="name">Full name</label>
            <input id="name" name="name" defaultValue={state?.values?.name ?? name} required />
          </div>
          <div className="sl-field">
            <label htmlFor="phone">Mobile number (private)</label>
            <input id="phone" name="phone" type="tel" defaultValue={state?.values?.phone ?? phone} required />
          </div>
        </div>
      </div>
      {!asAdmin ? (
        <div className="sl-card">
          <h2>
            <i className="fa-solid fa-key"></i> Change password
          </h2>
          <div className="sl-grid sl-g2">
            <div className="sl-field">
              <label htmlFor="current_password">Current password</label>
              <input id="current_password" name="current_password" type="password" autoComplete="current-password" />
            </div>
            <div className="sl-field">
              <label htmlFor="new_password">New password</label>
              <input id="new_password" name="new_password" type="password" autoComplete="new-password" minLength={8} />
              <small>Leave empty to keep your password.</small>
            </div>
          </div>
        </div>
      ) : null}
      <SubmitBtn className="sl-btn" pending="Saving…">
        <i className="fa-solid fa-floppy-disk"></i> Save
      </SubmitBtn>
    </form>
  );
}
