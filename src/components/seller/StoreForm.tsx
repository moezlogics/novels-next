"use client";
import { useActionState, useState } from "react";
import { sellerSaveStore } from "@/app/seller/actions";
import { Errors, SubmitBtn } from "./SellerForms";

export interface StoreInit {
  store_name: string;
  bio: string;
  city: string;
  return_policy: string;
  shipping_fee: number;
  free_shipping_over: number;
  processing_days: number;
  logo: string;
  banner: string;
}

const src = (p: string) => (!p ? "" : p.startsWith("blob:") || p.startsWith("/") ? p : `/${p}`);

export default function StoreForm({ init }: { init: StoreInit }) {
  const [state, action] = useActionState(sellerSaveStore, null);
  const v = state?.values || {};
  const [logo, setLogo] = useState(src(init.logo));
  const [banner, setBanner] = useState(src(init.banner));
  const val = (k: keyof StoreInit) => (v[k] !== undefined ? v[k] : String(init[k] ?? ""));
  return (
    <form action={action}>
      <Errors state={state} />
      <div className="sl-card">
        <h2>
          <i className="fa-solid fa-image"></i> Logo &amp; banner
        </h2>
        <div style={{ position: "relative", height: 140, borderRadius: 12, overflow: "hidden", background: banner ? `center/cover url(${banner})` : "linear-gradient(135deg,#0e7490,#67c3d6)", marginBottom: 44 }}>
          <label className="sl-btn ghost sm" style={{ position: "absolute", right: 10, top: 10 }}>
            <i className="fa-solid fa-camera"></i> Banner
            <input type="file" name="banner" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && setBanner(URL.createObjectURL(e.target.files[0]))} />
          </label>
          <label style={{ position: "absolute", left: 16, bottom: -36, width: 84, height: 84, borderRadius: "50%", border: "4px solid #fff", background: logo ? `center/cover url(${logo})` : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,.12)" }}>
            {!logo ? <i className="fa-solid fa-camera" style={{ color: "#64748b" }}></i> : null}
            <input type="file" name="logo" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && setLogo(URL.createObjectURL(e.target.files[0]))} />
          </label>
        </div>
        <small className="sl-muted sl-small">Tap the circle for your logo or photo. Banner works best at 1600×400.</small>
      </div>
      <div className="sl-card">
        <h2>
          <i className="fa-solid fa-store"></i> About your store
        </h2>
        <div className="sl-grid sl-g2">
          <div className="sl-field">
            <label htmlFor="store_name">Store name</label>
            <input id="store_name" name="store_name" required maxLength={80} defaultValue={val("store_name")} />
          </div>
          <div className="sl-field">
            <label htmlFor="city">City (ships from)</label>
            <input id="city" name="city" maxLength={60} defaultValue={val("city")} />
          </div>
        </div>
        <div className="sl-field">
          <label htmlFor="bio">About</label>
          <textarea id="bio" name="bio" rows={4} maxLength={1500} defaultValue={val("bio")} placeholder="Who you are, what you write or publish." />
          <small>Shown on your store page. No phone numbers, links or social handles.</small>
        </div>
      </div>
      <div className="sl-card">
        <h2>
          <i className="fa-solid fa-truck"></i> Shipping
        </h2>
        <div className="sl-grid sl-g3">
          <div className="sl-field">
            <label htmlFor="shipping_fee">Shipping fee per order (Rs)</label>
            <input id="shipping_fee" name="shipping_fee" type="number" min={0} defaultValue={val("shipping_fee")} />
          </div>
          <div className="sl-field">
            <label htmlFor="free_shipping_over">Free shipping over (Rs)</label>
            <input id="free_shipping_over" name="free_shipping_over" type="number" min={0} defaultValue={val("free_shipping_over")} />
            <small>0 = never free.</small>
          </div>
          <div className="sl-field">
            <label htmlFor="processing_days">Ships within (days)</label>
            <input id="processing_days" name="processing_days" type="number" min={1} max={30} defaultValue={val("processing_days")} />
          </div>
        </div>
        <div className="sl-field">
          <label htmlFor="return_policy">Return policy</label>
          <textarea id="return_policy" name="return_policy" rows={3} maxLength={1500} defaultValue={val("return_policy")} placeholder="e.g. Damaged books are replaced within 7 days." />
        </div>
      </div>
      <SubmitBtn className="sl-btn" pending="Saving…">
        <i className="fa-solid fa-floppy-disk"></i> Save store
      </SubmitBtn>
    </form>
  );
}
