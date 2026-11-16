"use server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { col, nextId } from "@/lib/db";
import { back, int, requireAdmin, str } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { bustShop, checkStoreProfile, uniqueSellerSlug } from "@/lib/marketplace";
import { startSellerSession } from "@/lib/sellerAuth";

const LIST = "/newlogin/sellers/";

/** Show a new password once: a 60-second private cookie, never the URL (URLs end up in history/logs). */
async function flashPassword(pw: string) {
  (await cookies()).set("kn_seller_pw", pw, { httpOnly: true, sameSite: "strict", path: "/newlogin/sellers/", maxAge: 60, secure: process.env.NODE_ENV === "production" && (process.env.SITE_URL || "").startsWith("https") });
}

/** Admin creates a seller account and hands the login to the writer. */
export async function createSeller(fd: FormData) {
  await requireAdmin();
  const s = await getSettings();
  const name = str(fd, "name", 80);
  const store = str(fd, "store_name", 80) || name;
  const email = str(fd, "email", 120).toLowerCase();
  const phone = str(fd, "phone", 20).replace(/[\s-]/g, "");
  if (name.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back(`${LIST}?add=1`, "Enter a name and a valid email", "err");
  const blocks = checkStoreProfile({ store_name: store, bio: "", return_policy: "", city: "" });
  if (blocks.length) back(`${LIST}?add=1`, blocks[0], "err");
  const sellers = await col.sellers();
  if (await sellers.findOne({ email }, { projection: { _id: 1 } })) back(`${LIST}?add=1`, "A seller with this email already exists", "err");
  const password = str(fd, "password", 100) || randomBytes(6).toString("base64url");
  if (password.length < 8 && str(fd, "password")) back(`${LIST}?add=1`, "Password must be at least 8 characters", "err");
  const id = await nextId("sellers");
  await sellers.insertOne({
    _id: id,
    name,
    store_name: store,
    slug: await uniqueSellerSlug(store),
    email,
    phone,
    password_hash: await hashPassword(password),
    bio: "",
    logo: "",
    banner: "",
    city: str(fd, "city", 60),
    status: "active",
    verified: fd.get("verified") === "1",
    created_by: "admin",
    shipping_fee: s.shipping_fee ?? 150,
    free_shipping_over: 0,
    processing_days: 2,
    return_policy: "",
    // admin-made accounts are trusted: their books skip the first-products review
    approved_products: fd.get("trusted") === "1" ? 999 : 0,
    strikes: 0,
    created_at: new Date(),
  });
  // the password is shown once, on the seller page, so the admin can hand it over
  await flashPassword(password);
  redirect(`${LIST}${id}/?ok=${encodeURIComponent("Seller account created ✓")}`);
}

export async function sellerAdminAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = int(fd, "id") || 0;
  const a = str(fd, "a");
  const sellers = await col.sellers();
  const seller = await sellers.findOne({ _id: id });
  if (!seller) back(LIST, "Seller not found", "err");
  const page = `${LIST}${id}/`;
  const products = await col.products();

  if (a === "approve" || a === "activate") {
    await sellers.updateOne({ _id: id }, { $set: { status: "active", updated_at: new Date() } });
    await products.updateMany({ seller_id: id, suspended: true } as Record<string, unknown>, { $set: { status: "active" }, $unset: { suspended: "" } });
    bustShop();
    back(page, "Seller is active ✓");
  }
  if (a === "suspend") {
    await sellers.updateOne({ _id: id }, { $set: { status: "suspended", updated_at: new Date() } });
    // hide their live books, remember which ones to bring back
    await products.updateMany({ seller_id: id, status: "active" }, { $set: { status: "inactive", suspended: true } as Record<string, unknown> });
    bustShop();
    back(page, "Seller suspended. Their books are hidden from the store.");
  }
  if (a === "verify" || a === "unverify") {
    await sellers.updateOne({ _id: id }, { $set: { verified: a === "verify" } });
    bustShop();
    back(page, a === "verify" ? "Verified badge added ✓" : "Verified badge removed");
  }
  if (a === "trust") {
    await sellers.updateOne({ _id: id }, { $set: { approved_products: 999 } });
    back(page, "Trusted: clean books now go live without review ✓");
  }
  if (a === "reset_strikes") {
    await sellers.updateOne({ _id: id }, { $set: { strikes: 0 } });
    back(page, "Strikes cleared");
  }
  if (a === "password") {
    const pw = str(fd, "password", 100) || randomBytes(6).toString("base64url");
    if (pw.length < 8) back(page, "Password must be at least 8 characters", "err");
    await sellers.updateOne({ _id: id }, { $set: { password_hash: await hashPassword(pw) } });
    await flashPassword(pw);
    redirect(`${page}?ok=${encodeURIComponent("New password set ✓")}`);
  }
  if (a === "save") {
    const email = str(fd, "email", 120).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back(page, "Invalid email", "err");
    if (await sellers.findOne({ email, _id: { $ne: id } }, { projection: { _id: 1 } })) back(page, "Another seller uses this email", "err");
    const store = str(fd, "store_name", 80) || seller.store_name;
    await sellers.updateOne(
      { _id: id },
      {
        $set: {
          name: str(fd, "name", 80) || seller.name,
          store_name: store,
          slug: store !== seller.store_name ? await uniqueSellerSlug(store, id) : seller.slug,
          email,
          phone: str(fd, "phone", 20).replace(/[\s-]/g, ""),
          city: str(fd, "city", 60),
          notes: str(fd, "notes", 2000),
          updated_at: new Date(),
        },
      },
    );
    bustShop();
    back(page, "Seller saved ✓");
  }
  if (a === "login_as") {
    await startSellerSession(seller, admin.username);
    redirect("/seller/");
  }
  if (a === "delete") {
    const open = await (await col.orders()).countDocuments({ seller_id: id, status: { $in: ["pending", "processing", "shipped"] } });
    if (open) back(page, `This seller has ${open} open orders. Suspend instead, or close the orders first.`, "err");
    await products.deleteMany({ seller_id: id });
    await sellers.deleteOne({ _id: id });
    bustShop();
    back(LIST, "Seller and their books deleted");
  }
  back(page, "Unknown action", "err");
}
