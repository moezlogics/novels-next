import { randomBytes } from "node:crypto";
import { col, nextId } from "@/lib/db";
import { getMember } from "@/lib/auth";
import { getSettings, siteUrl } from "@/lib/settings";
import { effectivePrice, notifyDiscord, shippingFor } from "@/lib/shop";
import { bustShop } from "@/lib/marketplace";
import { clientIp } from "@/lib/moderation";
import type { Order, OrderItem, Seller } from "@/lib/types";

export const dynamic = "force-dynamic";

const recent = new Map<string, number[]>();
/** Max 5 checkouts per IP per 10 minutes (stops fake-order floods). */
function limited(ip: string) {
  const now = Date.now();
  const list = (recent.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now);
  recent.set(ip, list);
  if (recent.size > 5000) recent.clear();
  return list.length > 5;
}

/**
 * One checkout → one order per seller (each seller ships their own books with
 * their own shipping fee). Orders placed together share a checkout_id.
 */
export async function POST(req: Request) {
  const s = await getSettings();
  if (s.shop_coming_soon) return Response.json({ error: "Shop is not open yet." }, { status: 403 });
  if (limited(clientIp(req))) return Response.json({ error: "Too many orders from your connection. Please wait a few minutes." }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const f = (k: string, max: number) =>
    String(b[k] || "")
      .replace(/<[^>]*>/g, "")
      .trim()
      .slice(0, max);
  const name = f("name", 120);
  const email = f("email", 160).toLowerCase();
  const phone = f("phone", 20);
  const city = f("city", 80);
  const address = f("address", 500);
  const notes = f("notes", 300);
  if (!name || !phone || !city || !address) return Response.json({ error: "Please fill in all required fields." }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (!/^(\+?92|0)?3\d{9}$/.test(phone.replace(/[\s-]/g, "")) && phone.replace(/\D/g, "").length < 10) return Response.json({ error: "Please enter a valid phone number." }, { status: 400 });

  const maxQty = s.max_qty_per_item || 10;
  const wanted: { id: number; qty: number }[] = (Array.isArray(b.items) ? b.items : [])
    .slice(0, 50)
    .map((i: { id: unknown; qty: unknown }) => ({ id: parseInt(String(i.id), 10), qty: Math.max(1, Math.min(maxQty, parseInt(String(i.qty), 10) || 1)) }))
    .filter((i: { id: number }) => i.id > 0);
  if (!wanted.length) return Response.json({ error: "Your cart is empty." }, { status: 400 });

  const products = await col.products();
  const rows = await products.find({ _id: { $in: wanted.map((w) => w.id) }, status: "active" }).toArray();
  const pm = new Map(rows.map((p) => [p._id, p]));
  const sellerIds = [...new Set(rows.map((p) => p.seller_id).filter((x): x is number => !!x))];
  const sellers = sellerIds.length ? await (await col.sellers()).find({ _id: { $in: sellerIds }, status: "active" }).toArray() : [];
  const sm = new Map<number, Seller>(sellers.map((x) => [x._id, x]));

  const groups = new Map<number, OrderItem[]>(); // seller id (0 = site) → items
  for (const w of wanted) {
    const p = pm.get(w.id);
    if (!p || (p.seller_id && !sm.has(p.seller_id))) return Response.json({ error: "A book in your cart is no longer available. Please check your cart." }, { status: 400 });
    if (p.stock < w.qty) return Response.json({ error: `Only ${p.stock} copies of "${p.title}" are in stock.` }, { status: 400 });
    const key = p.seller_id || 0;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ product_id: p._id, title: p.title, quantity: w.qty, price: effectivePrice(p), image: p.image, slug: p.slug });
  }
  const all = [...groups.values()].flat();
  const grand = all.reduce((a, i) => a + i.price * i.quantity, 0);
  if (s.min_order_amount && grand < s.min_order_amount) return Response.json({ error: `Minimum order is Rs. ${s.min_order_amount.toLocaleString()}.` }, { status: 400 });

  // reserve stock atomically (rolls back on conflict)
  const done: OrderItem[] = [];
  for (const it of all) {
    const r = await products.updateOne({ _id: it.product_id, stock: { $gte: it.quantity } }, { $inc: { stock: -it.quantity, sold: it.quantity } });
    if (!r.modifiedCount) {
      for (const d of done) await products.updateOne({ _id: d.product_id }, { $inc: { stock: d.quantity, sold: -d.quantity } });
      return Response.json({ error: `"${it.title}" just went out of stock.` }, { status: 409 });
    }
    done.push(it);
  }

  const m = await getMember();
  const checkout_id = randomBytes(10).toString("hex");
  const created: Order[] = [];
  for (const [sid, items] of groups) {
    const seller = sid ? sm.get(sid)! : null;
    const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
    const shipping = seller ? shippingFor(subtotal, seller.shipping_fee || 0, seller.free_shipping_over || 0) : shippingFor(subtotal, s.shipping_fee ?? 150, s.free_shipping_over ?? 0);
    const order: Order = {
      _id: await nextId("orders"),
      member_id: m?._id ?? null,
      seller_id: sid || null,
      checkout_id,
      name,
      email,
      phone,
      address,
      city,
      subtotal,
      shipping,
      total: subtotal + shipping,
      payment_method: "COD",
      status: "pending",
      tracking_token: randomBytes(16).toString("hex"),
      items,
      notes,
      history: [{ status: "pending", at: new Date(), by: "buyer" }],
      created_at: new Date(),
    };
    await (await col.orders()).insertOne(order);
    created.push(order);
  }
  bustShop();

  const base = siteUrl();
  for (const o of created) {
    const seller = o.seller_id ? sm.get(o.seller_id) : null;
    void notifyDiscord(
      `🛒 **New Order #${o._id}** — Rs. ${o.total}${seller ? ` · seller: ${seller.store_name}` : ""}\n👤 ${name} · ${phone}\n📍 ${city}: ${address}\n📚 ${o.items.map((i) => `${i.title} ×${i.quantity}`).join(", ")}${notes ? `\n📝 ${notes}` : ""}\n🔗 ${base}/newlogin/orders/`,
    );
  }
  for (const it of all) {
    const p = await products.findOne({ _id: it.product_id }, { projection: { stock: 1, title: 1 } });
    if (p && p.stock <= 0) void notifyDiscord(`⚠️ **Out of stock:** ${p.title} (#${p._id})`);
  }
  const first = created[0];
  return Response.json({
    // `order` kept for older clients
    order: { id: first._id, total: first.total, tracking_token: first.tracking_token, items: first.items.map((i) => ({ title: i.title, quantity: i.quantity, price: i.price })) },
    checkout_id,
    orders: created.map((o) => ({ id: o._id, total: o.total, tracking_token: o.tracking_token, seller: o.seller_id ? sm.get(o.seller_id)?.store_name || "" : s.site_name, items: o.items.map((i) => ({ title: i.title, quantity: i.quantity, price: i.price })) })),
  });
}
