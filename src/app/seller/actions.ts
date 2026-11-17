"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { col, nextId } from "@/lib/db";
import { checkPassword, hashPassword, recordAttempt, tooManyAttempts } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { endSellerSession, requireSeller, sellerBack, startSellerSession } from "@/lib/sellerAuth";
import { brainRules, bustShop, checkStoreProfile, saveSellerProduct, setOrderStatus, uniqueSellerSlug, type ProductDraft } from "@/lib/marketplace";
import { checkListing, plainText } from "@/lib/spamBrain";
import { saveImage } from "@/lib/storage";
import { notifyDiscord } from "@/lib/shop";
import { siteUrl } from "@/lib/settings";
import type { OrderStatus } from "@/lib/types";

export type FormState = { errors?: string[]; ok?: string; values?: Record<string, string> } | null;

const s = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);
const n = (fd: FormData, k: string) => {
  const v = parseFloat(String(fd.get(k) ?? "").replace(/,/g, ""));
  return Number.isFinite(v) ? v : 0;
};

async function ipKey(prefix: string) {
  const h = await headers();
  return `${prefix}:${(h.get("cf-connecting-ip") || h.get("x-forwarded-for") || "local").split(",")[0].trim()}`;
}

const phoneOk = (p: string) => /^(\+?92|0)?3\d{9}$/.test(p.replace(/[\s-]/g, ""));

// ── Sign up / log in ─────────────────────────────────────────
export async function sellerRegister(_: FormState, fd: FormData): Promise<FormState> {
  const st = await getSettings();
  const values = { name: s(fd, "name", 80), store_name: s(fd, "store_name", 80), email: s(fd, "email", 120).toLowerCase(), phone: s(fd, "phone", 20), city: s(fd, "city", 60) };
  if (!st.sellers_enabled || !st.seller_registration_open) return { errors: ["Seller sign-up is closed right now. Please contact us."], values };
  if (s(fd, "website")) return { errors: ["Something went wrong. Please try again."], values }; // bot trap
  const key = await ipKey("sreg");
  if (await tooManyAttempts(key)) return { errors: ["Too many attempts. Please wait 15 minutes."], values };

  const errors: string[] = [];
  if (values.name.length < 3) errors.push("Enter your full name.");
  if (values.store_name.length < 3) errors.push("Enter a store name (for example your pen name or publisher name).");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.push("Enter a valid email address.");
  if (!phoneOk(values.phone)) errors.push("Enter a valid Pakistani mobile number (03xx xxxxxxx). Only the admin and your buyers' orders use it — it is never shown publicly.");
  const pw = String(fd.get("password") || "");
  if (pw.length < 8) errors.push("Password must be at least 8 characters.");
  if (fd.get("terms") !== "1") errors.push("Please accept the seller rules.");
  errors.push(...checkStoreProfile({ store_name: values.store_name, bio: "", return_policy: "", city: values.city }));
  const sellers = await col.sellers();
  if (!errors.length && (await sellers.findOne({ email: values.email }, { projection: { _id: 1 } }))) errors.push("An account with this email already exists. Please log in.");
  if (errors.length) {
    await recordAttempt(key, false);
    return { errors, values };
  }
  const id = await nextId("sellers");
  const doc = {
    _id: id,
    name: values.name,
    store_name: values.store_name,
    slug: await uniqueSellerSlug(values.store_name),
    email: values.email,
    phone: values.phone.replace(/[\s-]/g, ""),
    password_hash: await hashPassword(pw),
    bio: "",
    logo: "",
    banner: "",
    city: values.city,
    status: (st.seller_approval_required ? "pending" : "active") as "pending" | "active",
    verified: false,
    created_by: "self" as const,
    shipping_fee: st.shipping_fee ?? 150,
    free_shipping_over: 0,
    processing_days: 2,
    return_policy: "",
    approved_products: 0,
    strikes: 0,
    created_at: new Date(),
  };
  await sellers.insertOne(doc);
  await recordAttempt(key, true);
  void notifyDiscord(`🧑‍💼 **New seller:** ${doc.store_name} (${doc.name}) · ${doc.city || "—"}${doc.status === "pending" ? " — waiting for approval" : ""}\n🔗 ${siteUrl()}/newlogin/sellers/${id}/`);
  await startSellerSession(doc);
  redirect("/seller/?ok=" + encodeURIComponent(doc.status === "pending" ? "Account created. An admin will approve it soon." : "Welcome! Your seller account is ready. Add your first book."));
}

export async function sellerLogin(_: FormState, fd: FormData): Promise<FormState> {
  const email = s(fd, "email", 120).toLowerCase();
  const key = await ipKey("slog");
  if (await tooManyAttempts(key)) return { errors: ["Too many attempts. Please wait 15 minutes."], values: { email } };
  const seller = await (await col.sellers()).findOne({ email });
  if (!seller || !(await checkPassword(String(fd.get("password") || ""), seller.password_hash))) {
    await recordAttempt(key, false);
    return { errors: ["Wrong email or password."], values: { email } };
  }
  await recordAttempt(key, true);
  await (await col.sellers()).updateOne({ _id: seller._id }, { $set: { last_login: new Date() } });
  await startSellerSession(seller);
  redirect("/seller/");
}

export async function sellerLogout() {
  await endSellerSession();
  redirect("/seller/login/");
}

// ── Products ─────────────────────────────────────────────────
export async function sellerSaveProduct(_: FormState, fd: FormData): Promise<FormState> {
  const seller = await requireSeller();
  const st = await getSettings();
  const id = parseInt(s(fd, "id"), 10) || null;
  const draft: ProductDraft = {
    title: s(fd, "title", 160),
    author: s(fd, "author", 120),
    description: s(fd, "description", 5000),
    price: n(fd, "price"),
    sale_price: n(fd, "sale_price") || null,
    stock: Math.floor(n(fd, "stock")),
    language: ["Urdu", "English", "Roman Urdu", "Punjabi", "Other"].includes(s(fd, "language")) ? s(fd, "language") : "Urdu",
    pages_count: Math.floor(n(fd, "pages_count")),
    binding: s(fd, "binding") === "hardcover" ? "hardcover" : s(fd, "binding") === "paperback" ? "paperback" : "",
    condition: s(fd, "condition") === "used" ? "used" : "new",
    isbn: s(fd, "isbn", 20),
    tags: s(fd, "tags", 300)
      .split(",")
      .map((t) => plainText(t, 30).toLowerCase())
      .filter(Boolean),
    image: "",
    gallery_images: [],
    hidden: fd.get("hidden") === "1",
  };
  const values = Object.fromEntries(["title", "author", "description", "price", "sale_price", "stock", "language", "pages_count", "binding", "condition", "isbn", "tags"].map((k) => [k, s(fd, k, 5000)]));

  // contact details etc. are checked BEFORE uploading any photo
  const pre = checkListing({ title: draft.title, description: draft.description, author: draft.author, tags: draft.tags, price: draft.price, salePrice: draft.sale_price }, brainRules(st));
  if (pre.blocks.length) {
    await (await col.sellers()).updateOne({ _id: seller._id }, { $inc: { strikes: 1 } });
    return { errors: pre.blocks, values };
  }

  // photos: kept ones (must already belong to this product) + new uploads, in the chosen order
  const existing = id ? await (await col.products()).findOne({ _id: id, seller_id: seller._id }) : null;
  const owned = new Set([existing?.image, ...(existing?.gallery_images || [])].filter(Boolean) as string[]);
  const order = s(fd, "photo_order", 5000).split("|").filter(Boolean);
  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const maxImg = st.seller_max_images ?? 6;
  if (order.filter((o) => o.startsWith("new:")).length + order.filter((o) => owned.has(o)).length > maxImg) return { errors: [`At most ${maxImg} photos per product.`], values };
  const uploaded = new Map<string, string>();
  try {
    for (let i = 0; i < files.length && i < maxImg; i++) {
      if (files[i].size > 8 * 1024 * 1024) return { errors: ["Each photo must be smaller than 8 MB."], values };
      uploaded.set(`new:${i}`, (await saveImage(files[i], { alt: draft.title, maxWidth: 1400 })).path);
    }
  } catch (e) {
    return { errors: [(e as Error).message || "Photo upload failed."], values };
  }
  const photos = order.map((o) => (o.startsWith("new:") ? uploaded.get(o) : owned.has(o) ? o : undefined)).filter((x): x is string => !!x);
  draft.image = photos[0] || "";
  draft.gallery_images = photos.slice(1);

  const r = await saveSellerProduct(seller, draft, id);
  if (!r.ok) return { errors: r.errors, values };
  if (r.status === "pending") void notifyDiscord(`📚 **Book waiting for review:** ${draft.title} — ${seller.store_name}\n🔗 ${siteUrl()}/newlogin/products/?status=pending`);
  sellerBack("/seller/products/", r.note);
}

export async function sellerProductAction(fd: FormData) {
  const seller = await requireSeller();
  const id = parseInt(s(fd, "id"), 10);
  const a = s(fd, "a");
  const products = await col.products();
  const p = await products.findOne({ _id: id, seller_id: seller._id });
  if (!p) sellerBack("/seller/products/", "Product not found", "err");
  if (a === "delete") {
    const hasOrders = await (await col.orders()).countDocuments({ "items.product_id": id, status: { $in: ["pending", "processing", "shipped"] } });
    if (hasOrders) sellerBack("/seller/products/", "This book has open orders. Hide it instead, and delete it after the orders are delivered.", "err");
    await products.deleteOne({ _id: id });
    bustShop();
    sellerBack("/seller/products/", "Product deleted");
  }
  if (a === "hide" && p.status === "active") await products.updateOne({ _id: id }, { $set: { status: "inactive" } });
  if (a === "show" && p.status === "inactive") await products.updateOne({ _id: id }, { $set: { status: "active" } });
  if (a === "stock") await products.updateOne({ _id: id }, { $set: { stock: Math.max(0, Math.min(100000, Math.floor(n(fd, "stock")))) } });
  bustShop();
  sellerBack("/seller/products/", a === "stock" ? "Stock updated ✓" : a === "hide" ? "Book hidden from the store" : "Book is live again ✓");
}

// ── Orders ───────────────────────────────────────────────────
export async function sellerOrderStatus(fd: FormData) {
  const seller = await requireSeller();
  const id = parseInt(s(fd, "id"), 10);
  const status = s(fd, "status") as OrderStatus;
  if (!["processing", "shipped", "completed", "cancelled"].includes(status)) sellerBack("/seller/orders/", "Unknown status", "err");
  const order = await (await col.orders()).findOne({ _id: id, seller_id: seller._id });
  if (!order) sellerBack("/seller/orders/", "Order not found", "err");
  if (order.status === "completed" || order.status === "cancelled") sellerBack(`/seller/orders/?open=${id}`, "This order is already closed.", "err");
  const courier = s(fd, "courier", 60);
  const tracking = s(fd, "tracking_number", 60);
  if (status === "shipped" && !tracking) sellerBack(`/seller/orders/?open=${id}`, "Enter the courier tracking number so the buyer can track the parcel.", "err");
  await setOrderStatus(order, status, `seller:${seller._id}`, { courier: courier || undefined, tracking_number: tracking || undefined, note: s(fd, "note", 200) || undefined });
  sellerBack(`/seller/orders/?open=${id}`, `Order #${id} marked as ${status === "completed" ? "delivered" : status} ✓`);
}

// ── Store profile & account ──────────────────────────────────
export async function sellerSaveStore(_: FormState, fd: FormData): Promise<FormState> {
  const seller = await requireSeller({ allowInactive: true });
  const p = {
    store_name: plainText(s(fd, "store_name", 80), 80),
    bio: plainText(s(fd, "bio", 1500), 1500),
    city: plainText(s(fd, "city", 60), 60),
    return_policy: plainText(s(fd, "return_policy", 1500), 1500),
    shipping_fee: Math.max(0, Math.min(5000, Math.round(n(fd, "shipping_fee")))),
    free_shipping_over: Math.max(0, Math.round(n(fd, "free_shipping_over"))),
    processing_days: Math.max(1, Math.min(30, Math.round(n(fd, "processing_days")) || 2)),
  };
  const values = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)]));
  const errors = checkStoreProfile(p);
  if (p.store_name.length < 3) errors.push("Store name is too short.");
  if (errors.length) {
    await (await col.sellers()).updateOne({ _id: seller._id }, { $inc: { strikes: 1 } });
    return { errors, values };
  }
  const set: Record<string, unknown> = { ...p, updated_at: new Date() };
  if (p.store_name !== seller.store_name) set.slug = await uniqueSellerSlug(p.store_name, seller._id);
  try {
    for (const k of ["logo", "banner"] as const) {
      const f = fd.get(k);
      if (f instanceof File && f.size > 0) {
        if (f.size > 8 * 1024 * 1024) return { errors: ["Images must be smaller than 8 MB."], values };
        set[k] = (await saveImage(f, { alt: `${p.store_name} ${k}`, maxWidth: k === "banner" ? 1600 : 600 })).path;
      }
      if (fd.get(`remove_${k}`) === "1") set[k] = "";
    }
  } catch (e) {
    return { errors: [(e as Error).message], values };
  }
  await (await col.sellers()).updateOne({ _id: seller._id }, { $set: set });
  bustShop();
  return { ok: "Store saved ✓", values };
}

export async function sellerSaveAccount(_: FormState, fd: FormData): Promise<FormState> {
  const seller = await requireSeller({ allowInactive: true });
  const name = s(fd, "name", 80);
  const phone = s(fd, "phone", 20);
  const errors: string[] = [];
  if (name.length < 3) errors.push("Enter your full name.");
  if (!phoneOk(phone)) errors.push("Enter a valid mobile number (03xx xxxxxxx).");
  const set: Record<string, unknown> = { name, phone: phone.replace(/[\s-]/g, ""), updated_at: new Date() };
  const newPw = String(fd.get("new_password") || "");
  if (newPw) {
    if (seller.asAdmin) errors.push("Admins cannot change a seller's password from here. Use the admin panel.");
    else if (!(await checkPassword(String(fd.get("current_password") || ""), seller.password_hash))) errors.push("Your current password is wrong.");
    if (newPw.length < 8) errors.push("New password must be at least 8 characters.");
    set.password_hash = await hashPassword(newPw);
  }
  if (errors.length) return { errors, values: { name, phone } };
  await (await col.sellers()).updateOne({ _id: seller._id }, { $set: set });
  return { ok: newPw ? "Account and password saved ✓" : "Account saved ✓", values: { name, phone } };
}
