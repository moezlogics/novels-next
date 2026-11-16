"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { avatarColor, initial, mediaUrl } from "@/lib/utils";
import { getGuestName, getGuestOrders, setGuestName } from "@/lib/readerStore";

type M = { id: number; name: string; username: string; email: string; phone: string; bio: string; profile_pic: string };

function Letter({ name, size = 64 }: { name: string; size?: number }) {
  return (
    <div className="guest-letter-avatar" style={{ backgroundColor: avatarColor(name), width: size, height: size, borderRadius: "50%", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size > 70 ? "1.5rem" : "1.35rem", flexShrink: 0 }}>
      {initial(name)}
    </div>
  );
}

export function EditProfileModal({ member, onClose }: { member: M; onClose: () => void }) {
  const router = useRouter();
  const [preview, setPreview] = useState(member.profile_pic ? mediaUrl(member.profile_pic) : "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const inp: React.CSSProperties = { width: "100%", height: 42, padding: "0 12px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: "0.9rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { fontSize: "0.8rem", fontWeight: 700, color: "#475569" };
  return (
    <div style={{ display: "flex", position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 99999, alignItems: "center", justifyContent: "center", padding: 16 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 440, width: "100%", display: "flex", flexDirection: "column", gap: 20, boxSizing: "border-box", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: 14 }}>
          <p style={{ fontSize: "1.15rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Edit Profile</p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#94a3b8", marginLeft: "auto", lineHeight: 1 }} aria-label="Close">
            ×
          </button>
        </div>
        <form
          style={{ display: "flex", flexDirection: "column", gap: 16, margin: 0 }}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr("");
            const r = await fetch("/api/auth/profile/", { method: "POST", body: new FormData(e.currentTarget) });
            const d = await r.json().catch(() => ({}));
            setBusy(false);
            if (!r.ok) return setErr(d.error || "Could not save.");
            onClose();
            router.refresh();
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ position: "relative", width: 80, height: 80 }}>
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--theme-secondary)" }} />
              ) : (
                <Letter name={member.name} size={80} />
              )}
              <label htmlFor="pp" style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: "50%", background: "var(--theme-secondary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px solid #fff" }}>
                <i className="fa-solid fa-camera" style={{ fontSize: "0.75rem" }}></i>
              </label>
            </div>
            <input type="file" id="pp" name="profile_pic" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && setPreview(URL.createObjectURL(e.target.files[0]))} />
            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Recommended: Square image, max 2MB</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={lbl}>
              Display Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input name="name" required defaultValue={member.name} maxLength={80} style={inp} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={lbl}>
              Mobile number <span style={{ fontWeight: 500, color: "#94a3b8" }}>(optional)</span>
            </label>
            <input name="phone" type="tel" defaultValue={member.phone} maxLength={20} placeholder="e.g. 03001234567" style={inp} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={lbl}>Bio</label>
            <textarea name="bio" defaultValue={member.bio} maxLength={255} rows={3} placeholder="A few words about you…" style={{ ...inp, height: "auto", padding: 12 }} />
          </div>
          {err ? <p style={{ color: "#b91c1c", fontSize: "0.82rem", margin: 0 }}>{err}</p> : null}
          <button type="submit" className="acct-btn acct-btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AccountHome({ member, orderCount, communityOpen, needPhone }: { member: M | null; orderCount: number; communityOpen: boolean; needPhone: boolean }) {
  const router = useRouter();
  const [guestOrders, setGuestOrders] = useState(0);
  const [edit, setEdit] = useState(false);
  const [phoneModal, setPhoneModal] = useState(needPhone);
  const [guestName, setGN] = useState("");
  const [guestInput, setGuestInput] = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    setGuestOrders(getGuestOrders().length);
    const g = getGuestName();
    setGN(g);
    setGuestInput(g);
  }, []);

  const signOut = async () => {
    if (!confirm("Sign out of your account?")) return;
    await fetch("/api/auth/logout/", { method: "POST" }).catch(() => {});
    window.location.href = "/login/";
  };

  const avatar = member?.profile_pic ? mediaUrl(member.profile_pic) : "";
  const item = (href: string, icon: string, label: string, right: React.ReactNode, cls = "", rel?: string) => (
    <Link href={href} className={`acct-menu-item ${cls}`} rel={rel}>
      <div className="acct-menu-left">
        <i className={`fa-solid ${icon}`}></i>
        <span>{label}</span>
      </div>
      <div className="acct-menu-right">
        {right}
        <i className="fa-solid fa-chevron-right"></i>
      </div>
    </Link>
  );

  return (
    <div className="acct-app-shell">
      {member ? (
        <>
          <div className="acct-hero">
            {avatar && imgOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="acct-hero-avatar" onError={() => setImgOk(false)} />
            ) : (
              <Letter name={member.name} size={72} />
            )}
            <div className="acct-hero-body">
              <h1 className="acct-hero-name">{member.name}</h1>
              <p className="acct-hero-handle">@{member.username}</p>
              {member.phone ? (
                <p className="acct-hero-bio">
                  <i className="fa-solid fa-phone" style={{ opacity: 0.7 }}></i> {member.phone}
                </p>
              ) : null}
              {member.bio ? <p className="acct-hero-bio">{member.bio}</p> : null}
            </div>
            <button type="button" className="acct-hero-edit" onClick={() => setEdit(true)} title="Edit profile">
              <i className="fa-solid fa-pen"></i>
            </button>
          </div>
          <div className="acct-menu-list">
            {communityOpen ? item(`/community/u/${encodeURIComponent(member.username)}/`, "fa-users", "Community Activities", <span className="acct-menu-hint">Posts &amp; profile</span>, "", "nofollow") : null}
            {item("/account/orders/", "fa-box", "My Orders", <span className="acct-menu-badge">{orderCount + guestOrders}</span>)}
            {communityOpen ? item("/community/", "fa-house", "Community Feed", null, "", "nofollow") : null}
            <button type="button" className="acct-menu-item" onClick={() => setEdit(true)}>
              <div className="acct-menu-left">
                <i className="fa-solid fa-user-pen"></i>
                <span>Edit Profile</span>
              </div>
              <div className="acct-menu-right">
                <i className="fa-solid fa-chevron-right"></i>
              </div>
            </button>
            <button type="button" className="acct-menu-item acct-menu-item-danger" onClick={signOut}>
              <div className="acct-menu-left">
                <i className="fa-solid fa-right-from-bracket"></i>
                <span>Sign Out</span>
              </div>
              <div className="acct-menu-right">
                <i className="fa-solid fa-chevron-right"></i>
              </div>
            </button>
          </div>
          {edit ? <EditProfileModal member={member} onClose={() => setEdit(false)} /> : null}
        </>
      ) : (
        <>
          <div className="acct-guest-hero">
            <div className="acct-auth-logo">
              <i className="fa-solid fa-book-open-reader"></i>
            </div>
            <h1 className="acct-guest-title">Your Account</h1>
            <p className="acct-guest-desc">{communityOpen ? "Sign in to access community, orders, and your reader profile — or continue as a guest." : "Sign in to track your orders — or continue as a guest."}</p>
            <div className="acct-guest-cta">
              <Link href="/login/?return=/account/" className="acct-btn acct-btn-primary acct-btn-block">
                Sign In
              </Link>
              <Link href="/register/?return=/account/" className="acct-btn acct-btn-outline acct-btn-block">
                Create Account
              </Link>
            </div>
          </div>
          <div className="acct-menu-list">
            {communityOpen ? item("/login/?return=/account/", "fa-users", "Community Activities", <span className="acct-lock-pill"><i className="fa-solid fa-lock"></i> Sign in</span>, "acct-menu-item-locked") : null}
            {item("/account/orders/", "fa-box", "My Orders", <span className="acct-menu-badge">{guestOrders}</span>)}
          </div>
          <div className="acct-card acct-guest-card">
            <div className="acct-card-title">
              <i className="fa-solid fa-user-ninja"></i> Guest Mode
            </div>
            <div className="acct-profile-row" style={{ marginBottom: 14 }}>
              <Letter name={guestName || "Guest Reader"} />
              <div style={{ flex: 1 }}>
                <p className="acct-name">{guestName || "Guest Reader"}</p>
                <p className="acct-handle">Local bookmarks &amp; checkout name</p>
              </div>
            </div>
            <div className="acct-field" style={{ marginBottom: 10 }}>
              <input type="text" maxLength={80} value={guestInput} onChange={(e) => setGuestInput(e.target.value)} placeholder="Guest display name (optional)" style={{ width: "100%", height: 40, padding: "0 12px", border: "1.5px solid #cbd5e1", borderRadius: 10, boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <button
              type="button"
              className="acct-btn acct-btn-primary acct-btn-sm"
              style={{ width: "100%" }}
              onClick={() => {
                const n = setGuestName(guestInput);
                setGN(n);
                alert(n ? "Guest name saved!" : "Guest name cleared.");
              }}
            >
              <i className="fa-solid fa-floppy-disk"></i> Save Guest Name
            </button>
          </div>
        </>
      )}

      {member && phoneModal ? (
        <div style={{ display: "flex", position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 99999, alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 24, maxWidth: 400, width: "100%", boxSizing: "border-box" }}>
            <p style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 800 }}>Add your mobile number</p>
            <p style={{ margin: "0 0 16px", fontSize: "0.88rem", color: "#64748b" }}>Optional — helps with order updates. You can skip for now.</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const phone = String(new FormData(e.currentTarget).get("phone") || "");
                const r = await fetch("/api/auth/profile/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
                const d = await r.json().catch(() => ({}));
                if (!r.ok) return setPhoneErr(d.error || "Could not save.");
                setPhoneModal(false);
                router.replace("/account/");
                router.refresh();
              }}
            >
              <div className="acct-field">
                <label htmlFor="setupPhone">Mobile number</label>
                <input type="tel" id="setupPhone" name="phone" maxLength={20} placeholder="e.g. 03001234567" style={{ width: "100%", height: 42, padding: "0 12px", border: "1.5px solid #cbd5e1", borderRadius: 10, boxSizing: "border-box" }} />
              </div>
              {phoneErr ? <p style={{ color: "#b91c1c", fontSize: "0.82rem", margin: "0 0 10px" }}>{phoneErr}</p> : null}
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="button" className="acct-btn acct-btn-ghost" style={{ flex: 1 }} onClick={() => { setPhoneModal(false); router.replace("/account/"); }}>
                  Skip
                </button>
                <button type="submit" className="acct-btn acct-btn-primary" style={{ flex: 1 }}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
