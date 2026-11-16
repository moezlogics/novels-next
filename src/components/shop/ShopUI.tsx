"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { addToCart, cartCount, clearCart, getCart, setQty } from "@/lib/cart";
import { addGuestOrder, getGuestName } from "@/lib/readerStore";
import { mediaUrl, thumbUrl } from "@/lib/utils";

function useCartCount() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const up = () => setN(cartCount());
    up();
    window.addEventListener("kn-cart", up);
    window.addEventListener("storage", up);
    return () => {
      window.removeEventListener("kn-cart", up);
      window.removeEventListener("storage", up);
    };
  }, []);
  return n;
}

function useShopToast() {
  const [t, setT] = useState<{ m: string; err: boolean } | null>(null);
  const timer = useRef(0);
  const show = (m: string, err = false) => {
    setT({ m, err });
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setT(null), 2500);
  };
  const el = t ? (
    <div style={{ position: "fixed", bottom: 90, right: 20, background: "#1e293b", color: "#fff", padding: "12px 18px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 9999 }}>
      <i className={`fa-solid ${t.err ? "fa-circle-xmark" : "fa-circle-check"}`} style={{ color: t.err ? "var(--shop-danger)" : "var(--shop-accent)" }}></i> <span>{t.m}</span>
    </div>
  ) : null;
  return { show, el };
}

export function ShopNav({ title, back = "/shop/", right = "home" }: { title: string; back?: string; right?: "home" | "cart" }) {
  const n = useCartCount();
  return (
    <nav className="sp-mobile-nav" aria-label="Shop navigation">
      <Link href={back} className="sp-mobile-nav-btn" aria-label="Back">
        <i className="fa-solid fa-arrow-left"></i>
      </Link>
      <span className="sp-mobile-nav-title">{title}</span>
      {right === "cart" ? (
        <Link href="/shop/cart/" className="sp-mobile-nav-btn sp-mobile-nav-cart" aria-label="Cart">
          <i className="fa-solid fa-bag-shopping"></i>
          {n > 0 ? <span className="sp-mobile-nav-badge">{n}</span> : null}
        </Link>
      ) : (
        <Link href="/" className="sp-mobile-nav-btn" aria-label="Home">
          <i className="fa-solid fa-house"></i>
        </Link>
      )}
    </nav>
  );
}

export function FloatingCart() {
  const n = useCartCount();
  return (
    <Link href="/shop/cart/" style={{ position: "fixed", bottom: 70, right: 20, width: 56, height: 56, borderRadius: "50%", background: "var(--shop-primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(0,0,0,0.3)", textDecoration: "none", zIndex: 999 }} aria-label="Cart">
      <i className="fa-solid fa-shopping-bag" style={{ fontSize: "1.4rem" }}></i>
      {n > 0 ? (
        <span style={{ position: "absolute", top: -3, right: -3, background: "var(--shop-danger)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>{n}</span>
      ) : null}
    </Link>
  );
}

export function AddToCartButton({ id, stock }: { id: number; stock: number }) {
  const { show, el } = useShopToast();
  if (stock <= 0)
    return (
      <button type="button" className="shop-card-btn" style={{ background: "#fee2e2", color: "#991b1b", cursor: "not-allowed" }} disabled>
        <i className="fa-solid fa-triangle-exclamation"></i> Out of Stock
      </button>
    );
  return (
    <>
      <button
        type="button"
        className="shop-card-btn"
        onClick={(e) => {
          e.preventDefault();
          const r = addToCart(id, 1, stock);
          show(r.msg, !r.ok);
        }}
      >
        <i className="fa-solid fa-cart-plus"></i> Add to Cart
      </button>
      {el}
    </>
  );
}

export function ProductGallery({ title, image, gallery, video }: { title: string; image: string; gallery: string[]; video: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const slides = [image, ...gallery].filter(Boolean);
  const [active, setActive] = useState(0);
  const count = slides.length + (video ? 1 : 0);
  const go = (i: number) => {
    wrap.current?.scrollTo({ left: i * (wrap.current?.offsetWidth || 0), behavior: "smooth" });
    setActive(i);
    if (vid.current) i === slides.length ? vid.current.play().catch(() => {}) : vid.current.pause();
  };
  const slideStyle: React.CSSProperties = { flex: "0 0 100%", width: "100%", scrollSnapAlign: "start", position: "relative", aspectRatio: "1 / 1.45", overflow: "hidden", borderRadius: 6, border: "1px solid var(--shop-border)", boxSizing: "border-box" };
  return (
    <div className="sp-details-image-wrap">
      <div
        ref={wrap}
        className="sp-gallery-main-wrap"
        style={{ position: "relative", display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", scrollBehavior: "smooth" }}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / Math.max(1, el.offsetWidth));
          if (i !== active) setActive(i);
        }}
      >
        {slides.map((s, i) => (
          <div key={i} className="sp-gallery-slide" style={slideStyle}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(s)} className="sp-details-image" alt={i ? "Gallery Slide" : title} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6, border: "none", display: "block" }} />
          </div>
        ))}
        {video ? (
          <div className="sp-gallery-slide" style={{ ...slideStyle, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <video ref={vid} className="sp-details-video" src={mediaUrl(video)} controls playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
          </div>
        ) : null}
      </div>
      {count > 1 ? (
        <div className="sp-gallery-grid">
          {slides.map((s, i) => (
            <button key={i} type="button" className={`sp-gallery-thumb${active === i ? " active" : ""}`} onClick={() => go(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbUrl(s, 200)} alt="" />
            </button>
          ))}
          {video ? (
            <button type="button" className={`sp-gallery-thumb sp-gallery-video-thumb${active === slides.length ? " active" : ""}`} onClick={() => go(slides.length)} aria-label="Play product video">
              <i className="fa-solid fa-play"></i>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ProductBuy({ id, stock }: { id: number; stock: number }) {
  const router = useRouter();
  const [q, setQ] = useState(1);
  const { show, el } = useShopToast();
  if (stock <= 0) return null;
  return (
    <>
      <div className="sp-details-qty">
        <button type="button" className="sp-details-qty-btn" onClick={() => setQ((x) => Math.max(1, x - 1))}>
          -
        </button>
        <input type="number" className="sp-details-qty-input" value={q} min={1} max={stock} readOnly />
        <button type="button" className="sp-details-qty-btn" onClick={() => (q < stock ? setQ(q + 1) : show(`Only ${stock} copies in stock.`, true))}>
          +
        </button>
      </div>
      <button
        type="button"
        className="sp-details-btn-cart"
        style={{ background: "#fff", color: "var(--shop-primary)", border: "1px solid var(--shop-primary)" }}
        onClick={() => {
          const r = addToCart(id, q, stock);
          show(r.msg, !r.ok);
        }}
      >
        <i className="fa-solid fa-cart-plus"></i> Add to Cart
      </button>
      <button
        type="button"
        className="sp-details-btn-buy"
        style={{ background: "var(--shop-primary)", color: "#fff" }}
        onClick={() => {
          const r = addToCart(id, q, stock);
          if (r.ok || getCart()[id]) router.push("/shop/checkout/");
          else show(r.msg, true);
        }}
      >
        <i className="fa-solid fa-bag-shopping"></i> Buy Now
      </button>
      {el}
    </>
  );
}

interface CartProduct {
  id: number;
  title: string;
  slug: string;
  image: string;
  effective: number;
  stock: number;
  seller_id: number;
  seller_name: string;
  ship_fee: number;
  free_over: number;
}
type CartLine = CartProduct & { qty: number };
interface CartGroup {
  seller_id: number;
  seller_name: string;
  items: CartLine[];
  subtotal: number;
  shipping: number;
  free_over: number;
}

const money = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-PK")}`;

function useCartItems() {
  const [items, setItems] = useState<CartLine[] | null>(null);
  const [rules, setRules] = useState({ max_qty: 10, min_order: 0 });
  const load = async () => {
    const c = getCart();
    const ids = Object.keys(c);
    if (!ids.length) return setItems([]);
    const d = await fetch(`/api/shop/products/?ids=${ids.join(",")}`).then((r) => r.json()).catch(() => ({ products: [] }));
    setRules({ max_qty: d.max_qty || 10, min_order: d.min_order || 0 });
    // drop books that are gone from the cart, so the badge stays honest
    const live = new Set((d.products as CartProduct[]).map((p) => String(p.id)));
    for (const id of ids) if (!live.has(id)) setQty(Number(id), 0);
    setItems((d.products as CartProduct[]).filter((p) => c[p.id]).map((p) => ({ ...p, qty: Math.min(c[p.id], Math.max(1, p.stock), d.max_qty || 10) })));
  };
  useEffect(() => {
    void load();
  }, []);
  const groups: CartGroup[] = [];
  for (const it of items || []) {
    let g = groups.find((x) => x.seller_id === it.seller_id);
    if (!g) groups.push((g = { seller_id: it.seller_id, seller_name: it.seller_name, items: [], subtotal: 0, shipping: it.ship_fee, free_over: it.free_over }));
    g.items.push(it);
    g.subtotal += it.effective * it.qty;
  }
  for (const g of groups) g.shipping = g.free_over > 0 && g.subtotal >= g.free_over ? 0 : g.items[0].ship_fee;
  const subtotal = groups.reduce((a, g) => a + g.subtotal, 0);
  const shipping = groups.reduce((a, g) => a + g.shipping, 0);
  return { items, groups, subtotal, shipping, rules, load };
}

function Summary({ groups, subtotal, shipping, children }: { groups: CartGroup[]; subtotal: number; shipping: number; children?: React.ReactNode }) {
  return (
    <div className="checkout-summary">
      <h4 style={{ margin: "0 0 16px 0", fontWeight: 800, color: "var(--shop-dark)" }}>Order summary</h4>
      <div className="cart-summary-row">
        <span>Books</span>
        <span>{money(subtotal)}</span>
      </div>
      {groups.map((g) => (
        <div className="cart-summary-row" key={g.seller_id}>
          <span>Shipping{groups.length > 1 ? ` · ${g.seller_name}` : ""}</span>
          <span>{g.shipping > 0 ? money(g.shipping) : "Free"}</span>
        </div>
      ))}
      {groups.map((g) =>
        g.shipping > 0 && g.free_over > 0 ? (
          <p key={`f${g.seller_id}`} style={{ fontSize: "0.75rem", color: "var(--shop-accent)", margin: "-6px 0 12px 0", fontWeight: 600 }}>
            Add {money(g.free_over - g.subtotal)} more from {groups.length > 1 ? g.seller_name : "this store"} for free shipping!
          </p>
        ) : null,
      )}
      <div className="cart-summary-row cart-summary-total">
        <span>Total (cash on delivery)</span>
        <span>{money(subtotal + shipping)}</span>
      </div>
      {groups.length > 1 ? <p style={{ fontSize: ".75rem", color: "var(--shop-gray)", margin: "0 0 12px" }}>Your books come from {groups.length} sellers, so they arrive in {groups.length} parcels.</p> : null}
      {children}
    </div>
  );
}

export function CartView() {
  const { items, groups, subtotal, shipping, rules, load } = useCartItems();
  const { show, el } = useShopToast();
  if (!items) return <div className="shop-empty-state"><i className="fa-solid fa-spinner fa-spin"></i></div>;
  if (!items.length)
    return (
      <div className="shop-empty-state">
        <div className="shop-empty-icon">
          <i className="fa-solid fa-shopping-bag"></i>
        </div>
        <h4 className="shop-empty-title">Your cart is empty</h4>
        <p className="shop-empty-text">Looks like you haven&apos;t added any books to your cart yet.</p>
        <Link href="/shop/" className="sp-submit" style={{ textDecoration: "none", margin: "0 auto", display: "inline-flex" }}>
          Start shopping
        </Link>
      </div>
    );
  const short = rules.min_order > 0 && subtotal < rules.min_order;
  return (
    <div className="checkout-grid">
      <div className="checkout-billing" style={{ padding: 0 }}>
        {groups.map((g) => (
          <div className="cart-table-card" style={{ margin: "0 0 12px", border: "none" }} key={g.seller_id}>
            <div className="cart-group-head">
              <i className="fa-solid fa-store"></i> {g.seller_name}
            </div>
            {g.items.map((it) => (
              <div className="cart-item" key={it.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbUrl(it.image, 200)} className="cart-item-image" alt={it.title} />
                <div className="cart-item-info">
                  <Link href={`/shop/${it.slug}/`} className="cart-item-title">
                    {it.title}
                  </Link>
                  <span className="cart-item-price">{money(it.effective)}</span>
                </div>
                <div className="cart-item-qty-actions">
                  <div className="sp-details-qty" style={{ height: 34 }}>
                    <button type="button" className="sp-details-qty-btn" style={{ width: 28 }} aria-label="One less" onClick={() => (setQty(it.id, Math.max(1, it.qty - 1)), load())}>
                      -
                    </button>
                    <input type="number" className="sp-details-qty-input" style={{ width: 34, fontSize: "0.85rem" }} value={it.qty} readOnly aria-label="Quantity" />
                    <button
                      type="button"
                      className="sp-details-qty-btn"
                      style={{ width: 28 }}
                      aria-label="One more"
                      onClick={() => (it.qty >= it.stock ? show(`Only ${it.stock} copies in stock.`, true) : it.qty >= rules.max_qty ? show(`Max ${rules.max_qty} copies per book.`, true) : (setQty(it.id, it.qty + 1), load()))}
                    >
                      +
                    </button>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", textAlign: "right", whiteSpace: "nowrap" }}>{money(it.effective * it.qty)}</div>
                  <button type="button" className="cart-item-remove" aria-label="Remove" onClick={() => (setQty(it.id, 0), load(), show("Item removed!"))}>
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <Summary groups={groups} subtotal={subtotal} shipping={shipping}>
        {short ? <div className="shop-alert shop-alert-err">Minimum order is {money(rules.min_order)}.</div> : null}
        <Link href="/shop/checkout/" className="cart-btn-checkout" aria-disabled={short} style={short ? { pointerEvents: "none", opacity: 0.6 } : undefined}>
          <i className="fa-solid fa-credit-card"></i> Proceed to checkout
        </Link>
        <Link href="/shop/" style={{ display: "block", textAlign: "center", marginTop: 12, fontSize: "0.85rem", fontWeight: 700, color: "var(--shop-secondary)", textDecoration: "none" }}>
          Continue shopping
        </Link>
      </Summary>
      {el}
    </div>
  );
}

export function CheckoutView({ member, note, bank }: { member: { name: string; email: string; phone: string } | null; note?: string; bank?: string }) {
  const { items, groups, subtotal, shipping } = useCartItems();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [guestName, setGuestName] = useState("");
  useEffect(() => setGuestName(getGuestName()), []);
  if (!items) return <div className="shop-empty-state"><i className="fa-solid fa-spinner fa-spin"></i></div>;
  if (!items.length)
    return (
      <div className="shop-empty-state">
        <h4 className="shop-empty-title">Your cart is empty</h4>
        <Link href="/shop/" className="sp-submit" style={{ textDecoration: "none", margin: "0 auto", display: "inline-flex" }}>
          Start shopping
        </Link>
      </div>
    );
  return (
    <>
      {err ? (
        <div className="shop-alert shop-alert-err" role="alert">
          <i className="fa-solid fa-triangle-exclamation"></i> {err}
        </div>
      ) : null}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setErr("");
          const f = Object.fromEntries(new FormData(e.currentTarget));
          const d = await fetch("/api/shop/checkout/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, items: items.map((i) => ({ id: i.id, qty: i.qty })) }) })
            .then((r) => r.json())
            .catch(() => ({ error: "Network error. Try again." }));
          if (!d.order) {
            setErr(d.error || "Could not place the order.");
            setBusy(false);
            return;
          }
          const orders: { id: number; total: number; tracking_token: string; items: { title: string; quantity: number; price: number }[] }[] = d.orders || [d.order];
          for (const o of orders) addGuestOrder({ id: o.id, total: o.total, status: "pending", name: String(f.name), created_at: new Date().toISOString(), items: o.items, tracking_token: o.tracking_token });
          clearCart();
          window.location.href = `/shop/success/?order_id=${d.order.id}&token=${d.order.tracking_token}`;
        }}
      >
        <div className="checkout-grid">
          <div className="checkout-billing">
            <h4 style={{ margin: "0 0 16px 0", fontWeight: 800, color: "var(--shop-dark)" }}>Delivery address</h4>
            <div className="shop-form-group">
              <label className="shop-form-label" htmlFor="co-name">Full name *</label>
              <input id="co-name" type="text" name="name" className="shop-form-control" defaultValue={member?.name || guestName} key={guestName} required autoComplete="name" placeholder="e.g. Muhammad Ali" maxLength={120} />
            </div>
            <div className="row">
              <div className="col-md-6 shop-form-group">
                <label className="shop-form-label" htmlFor="co-phone">Phone number *</label>
                <input id="co-phone" type="tel" name="phone" className="shop-form-control" defaultValue={member?.phone} required autoComplete="tel" inputMode="tel" placeholder="e.g. 03001234567" maxLength={20} />
              </div>
              <div className="col-md-6 shop-form-group">
                <label className="shop-form-label" htmlFor="co-email">Email (optional)</label>
                <input id="co-email" type="email" name="email" className="shop-form-control" defaultValue={member?.email} autoComplete="email" placeholder="for order updates" maxLength={160} />
              </div>
            </div>
            <div className="shop-form-group">
              <label className="shop-form-label" htmlFor="co-city">City *</label>
              <input id="co-city" type="text" name="city" className="shop-form-control" required autoComplete="address-level2" placeholder="e.g. Lahore" maxLength={80} />
            </div>
            <div className="shop-form-group">
              <label className="shop-form-label" htmlFor="co-address">Complete address *</label>
              <textarea id="co-address" name="address" className="shop-form-control" rows={3} required autoComplete="street-address" placeholder="House number, street, area, nearby landmark" style={{ resize: "none" }} maxLength={500}></textarea>
            </div>
            <div className="shop-form-group">
              <label className="shop-form-label" htmlFor="co-notes">Order notes (optional)</label>
              <input id="co-notes" type="text" name="notes" className="shop-form-control" placeholder="Anything the seller should know?" maxLength={300} />
            </div>
            <div style={{ marginTop: 20, padding: 12, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="fa-solid fa-truck" style={{ color: "var(--shop-secondary)" }}></i>
              <span style={{ fontSize: "0.8rem", color: "#1e40af", fontWeight: 600 }}>
                Payment: <strong>Cash on delivery</strong> — pay when your books arrive.
              </span>
            </div>
            {bank ? (
              <details style={{ marginTop: 10, fontSize: ".8rem" }}>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>Prefer to pay in advance?</summary>
                <p style={{ whiteSpace: "pre-line", margin: "6px 0 0" }}>{bank}</p>
              </details>
            ) : null}
            {note ? <p style={{ fontSize: ".8rem", color: "var(--shop-gray)", marginTop: 10, whiteSpace: "pre-line" }}>{note}</p> : null}
          </div>
          <Summary groups={groups} subtotal={subtotal} shipping={shipping}>
            <div style={{ maxHeight: 220, overflowY: "auto", borderTop: "1px solid var(--shop-border)", padding: "10px 0", marginBottom: 12 }}>
              {items.map((it) => (
                <div key={it.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: "0.82rem", marginBottom: 8, paddingRight: 6 }}>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {it.title} <strong style={{ color: "var(--shop-secondary)" }}>×{it.qty}</strong>
                  </span>
                  <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{money(it.effective * it.qty)}</span>
                </div>
              ))}
            </div>
            <button type="submit" className="cart-btn-checkout" style={{ border: "none" }} disabled={busy}>
              <i className="fa-solid fa-truck-fast"></i> {busy ? "Placing order…" : `Place order · ${money(subtotal + shipping)}`}
            </button>
          </Summary>
        </div>
      </form>
    </>
  );
}

export function ShopSearch({ value }: { value: string }) {
  return (
    <div style={{ margin: "10px auto 24px", maxWidth: 600, width: "100%" }}>
      <form action="/shop/" method="GET" style={{ display: "flex", gap: 6, margin: 0, width: "100%" }}>
        <div style={{ position: "relative", flexGrow: 1, display: "flex", alignItems: "center" }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: 12, color: "var(--shop-gray)", fontSize: "0.9rem" }}></i>
          <input type="text" name="search" className="shop-form-control" placeholder="Search printed books..." defaultValue={value} style={{ height: 38, paddingLeft: 36, width: "100%", border: "1px solid var(--shop-border)", borderRadius: 8 }} />
        </div>
        <button type="submit" className="sp-submit" style={{ height: 38, fontSize: "0.82rem", borderRadius: 8, padding: "0 18px", fontWeight: 700 }}>
          Search
        </button>
      </form>
    </div>
  );
}
