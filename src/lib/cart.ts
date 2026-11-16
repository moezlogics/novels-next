"use client";
// Cart lives in the browser (fast, works for guests); the server re-checks prices/stock at checkout.

const KEY = "kn_cart";
export type Cart = Record<string, number>;

export function getCart(): Cart {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "{}");
    return c && typeof c === "object" ? c : {};
  } catch {
    return {};
  }
}
function save(c: Cart) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {}
  window.dispatchEvent(new Event("kn-cart"));
}
export function cartCount(): number {
  return Object.values(getCart()).reduce((a, b) => a + (b || 0), 0);
}
export function addToCart(id: number, qty = 1, stock = 999): { ok: boolean; msg: string } {
  const c = getCart();
  const next = (c[id] || 0) + qty;
  if (next > stock) return { ok: false, msg: `Only ${stock} copies in stock.` };
  c[id] = next;
  save(c);
  return { ok: true, msg: "Item added to cart!" };
}
export function setQty(id: number, qty: number) {
  const c = getCart();
  if (qty <= 0) delete c[id];
  else c[id] = qty;
  save(c);
}
export function clearCart() {
  save({});
}
