/**
 * One-time migration: MySQL (PHP site) → MongoDB (Next.js site).
 *
 *   npm run migrate            # import everything (safe to re-run: it replaces)
 *
 * Keeps every numeric id, slug, image path and setting, so all URLs,
 * SEO and readers' saved bookmarks keep working.
 */
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";

function loadEnv(file: string) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv(path.resolve(".env.local"));
loadEnv(path.resolve(".env"));

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
const bool = (v: unknown) => v === 1 || v === "1" || v === true;
const date = (v: unknown) => {
  if (!v) return new Date();
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? new Date() : d;
};
const idList = (v: unknown) =>
  str(v)
    .split(",")
    .map((x) => parseInt(x.trim(), 10))
    .filter((x) => x > 0);

async function main() {
  const my = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "novels_db",
    charset: "utf8mb4",
    dateStrings: false,
  });
  const mongo = await new MongoClient(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017").connect();
  const db = mongo.db(process.env.MONGODB_DB || "novels");

  const tables = new Set(((await my.query("SHOW TABLES"))[0] as Record<string, string>[]).map((r) => Object.values(r)[0]));
  const rows = async (t: string): Promise<Record<string, unknown>[]> => (tables.has(t) ? ((await my.query(`SELECT * FROM \`${t}\``))[0] as Record<string, unknown>[]) : []);

  const counters: Record<string, number> = {};
  async function put(name: string, docs: Record<string, unknown>[], counter?: string) {
    const c = db.collection(name);
    await c.deleteMany({});
    if (docs.length) await c.insertMany(docs as never[]);
    if (counter) counters[counter] = Math.max(0, ...docs.map((d) => Number(d._id) || 0));
    console.log(`  ${name.padEnd(20)} ${docs.length}`);
  }

  console.log("Migrating MySQL → MongoDB …");

  await put(
    "categories",
    (await rows("categories")).map((r) => ({
      _id: Number(r.id),
      name: str(r.name),
      slug: str(r.slug).toLowerCase(),
      description: str(r.description),
      image: str(r.image).replace(/^\.\.\//, ""),
      meta_title: str(r.meta_title),
      meta_description: str(r.meta_description),
    })),
    "categories",
  );

  await put(
    "writers",
    (await rows("writers")).map((r) => ({
      _id: Number(r.id),
      name: str(r.name),
      slug: str(r.slug).toLowerCase(),
      bio: str(r.bio),
      short_bio: str(r.short_bio),
      profile_pic: str(r.profile_pic).replace(/^\.\.\//, ""),
      meta_title: str(r.meta_title),
      meta_description: str(r.meta_description),
    })),
    "writers",
  );

  await put(
    "series",
    (await rows("series")).map((r) => ({ _id: Number(r.id), name: str(r.name), slug: str(r.slug), created_at: date(r.created_at) })),
    "series",
  );

  await put(
    "posts",
    (await rows("posts")).map((r) => {
      const primary = num(r.category_id);
      const extra = idList(r.additional_categories).filter((x) => x !== primary);
      return {
        _id: Number(r.id),
        title: str(r.title).trim(),
        slug: str(r.slug).toLowerCase(),
        category_id: primary,
        additional_categories: extra,
        category_ids: [...(primary ? [primary] : []), ...extra],
        writer_id: num(r.writer_id),
        series_id: num(r.series_id),
        season_number: num(r.season_number),
        description: str(r.description),
        image: str(r.image).replace(/^\.\.\//, ""),
        read_online_url: str(r.read_online_url),
        download_url: str(r.download_url),
        file_size: str(r.file_size),
        file_type: str(r.file_type),
        pages: num(r.pages),
        posted_date: date(r.posted_date),
        updated_at: date(r.updated_at || r.posted_date),
        status: str(r.status) === "draft" ? "draft" : "active",
        is_featured: bool(r.is_featured),
        meta_title: str(r.meta_title),
        meta_description: str(r.meta_description),
        views: 0,
        reads: 0,
        downloads: 0,
      };
    }),
    "posts",
  );

  await put(
    "pages",
    (await rows("pages")).map((r) => ({
      _id: Number(r.id),
      title: str(r.title),
      slug: str(r.slug).toLowerCase(),
      content: str(r.content),
      meta_title: str(r.meta_title),
      meta_description: str(r.meta_description),
      status: (["publish", "draft", "trash"].includes(str(r.status)) ? str(r.status) : "publish") as string,
      created_at: date(r.created_at),
      updated_at: date(r.updated_at || r.created_at),
    })),
    "pages",
  );

  await put(
    "comments",
    (await rows("comments")).map((r) => ({
      _id: Number(r.id),
      post_id: Number(r.post_id),
      member_id: num(r.member_id),
      parent_id: num(r.parent_id),
      name: str(r.name),
      email: str(r.email),
      ip_address: str(r.ip_address),
      is_admin: bool(r.is_admin),
      message: str(r.message),
      status: str(r.status) === "pending" ? "pending" : "approved",
      created_at: date(r.created_at),
    })),
    "comments",
  );

  await put(
    "members",
    (await rows("members")).map((r) => ({
      _id: Number(r.id),
      google_id: str(r.google_id) || null,
      name: str(r.name),
      username: str(r.username),
      email: str(r.email).toLowerCase(),
      phone: str(r.phone) || null,
      password_hash: str(r.password_hash) || str(r.password) || null,
      profile_pic: str(r.profile_pic) || null,
      bio: str(r.bio) || null,
      status: str(r.status) === "suspended" ? "suspended" : "active",
      created_at: date(r.created_at),
      bookmarks: {},
    })),
    "members",
  );

  await put(
    "member_interests",
    (await rows("member_interests")).map((r) => ({
      member_id: Number(r.member_id),
      category_id: Number(r.category_id),
      weight: Number(r.weight) || 1,
      updated_at: date(r.updated_at),
    })),
  );

  await put(
    "community_posts",
    (await rows("community_posts")).map((r) => {
      let images: string[] = [];
      try {
        const parsed = JSON.parse(str(r.images) || "[]");
        if (Array.isArray(parsed)) images = parsed.map(String);
      } catch {}
      return { _id: Number(r.id), member_id: Number(r.member_id), category_id: num(r.category_id), content: str(r.content), images, created_at: date(r.created_at) };
    }),
    "community_posts",
  );
  await put(
    "community_likes",
    (await rows("community_likes")).map((r) => ({ member_id: Number(r.member_id), post_id: Number(r.post_id), created_at: date(r.created_at) })),
  );
  await put(
    "community_comments",
    (await rows("community_comments")).map((r) => ({ _id: Number(r.id), post_id: Number(r.post_id), member_id: Number(r.member_id), comment: str(r.comment), created_at: date(r.created_at) })),
    "community_comments",
  );

  await put(
    "contact_queries",
    (await rows("contact_queries")).map((r) => ({
      _id: Number(r.id),
      name: str(r.name),
      email: str(r.email),
      subject: str(r.subject),
      message: str(r.message),
      ip_address: str(r.ip_address),
      status: (["new", "read", "archived"].includes(str(r.status)) ? str(r.status) : "new") as string,
      created_at: date(r.created_at),
    })),
    "contact",
  );

  await put(
    "media",
    (await rows("media")).map((r) => ({
      _id: Number(r.id),
      filename: str(r.filename),
      original_name: str(r.original_name),
      path: str(r.path).replace(/^\.\.\//, ""),
      alt_text: str(r.alt_text),
      caption: str(r.caption),
      description: str(r.description),
      mime: str(r.mime),
      filesize: Number(r.filesize) || 0,
      width: Number(r.width) || 0,
      height: Number(r.height) || 0,
      created_at: date(r.created_at),
    })),
    "media",
  );

  const menu = (t: string) =>
    rows(t).then((list) =>
      list.map((r) => ({ _id: Number(r.id), label: str(r.label), url: str(r.url), parent_id: num(r.parent_id) || null, sort_order: Number(r.sort_order) || 0 })),
    );
  await put("menu_items", await menu("menu_items"), "menu_items");
  await put("footer_menu_items", await menu("footer_menu_items"), "footer_menu_items");

  const products = (await rows("products")).map((r) => {
    let gallery: string[] = [];
    try {
      const g = JSON.parse(str(r.gallery_images) || "[]");
      if (Array.isArray(g)) gallery = g.map(String);
    } catch {
      gallery = str(r.gallery_images).split(",").map((s) => s.trim()).filter(Boolean);
    }
    return {
      _id: Number(r.id),
      post_id: num(r.post_id),
      title: str(r.title),
      slug: str(r.slug) || `product-${r.id}`,
      description: str(r.description),
      price: Number(r.price) || 0,
      sale_price: num(r.sale_price),
      stock: Number(r.stock) || 0,
      image: str(r.image).replace(/^\.\.\//, ""),
      gallery_images: gallery,
      video_url: str(r.video_url),
      status: str(r.status) === "inactive" ? "inactive" : "active",
      meta_title: str(r.meta_title),
      meta_description: str(r.meta_description),
      created_at: date(r.created_at),
    };
  });
  // seller books exist only in the new site: keep them, replace only the site's own books
  {
    const c = db.collection("products");
    await c.deleteMany({ $or: [{ seller_id: null }, { seller_id: { $exists: false } }, { seller_id: 0 }] });
    if (products.length) await c.insertMany(products as never[]);
    counters.products = Math.max(0, ...products.map((d) => Number(d._id) || 0), ...(await c.find({}, { projection: { _id: 1 } }).toArray()).map((d) => Number(d._id) || 0));
    console.log(`  ${"products".padEnd(20)} ${products.length}`);
  }
  const pById = new Map(products.map((p) => [p._id, p]));

  const items = await rows("order_items");
  await put(
    "orders",
    (await rows("orders")).map((r) => ({
      _id: Number(r.id),
      member_id: num(r.member_id),
      name: str(r.name),
      email: str(r.email),
      phone: str(r.phone),
      address: str(r.address),
      city: str(r.city),
      subtotal: Number(r.subtotal) || 0,
      shipping: Number(r.shipping) || 0,
      total: Number(r.total) || 0,
      payment_method: str(r.payment_method) || "cod",
      status: (["pending", "processing", "completed", "cancelled"].includes(str(r.status)) ? str(r.status) : "pending") as string,
      tracking_token: str(r.tracking_token) || Math.random().toString(36).slice(2) + Date.now().toString(36),
      items: items
        .filter((i) => Number(i.order_id) === Number(r.id))
        .map((i) => {
          const p = pById.get(Number(i.product_id));
          return { product_id: Number(i.product_id), title: p?.title || `Product #${i.product_id}`, quantity: Number(i.quantity) || 1, price: Number(i.price) || 0, image: p?.image || "", slug: p?.slug || "" };
        }),
      created_at: date(r.created_at),
    })),
    "orders",
  );

  await put(
    "admin_users",
    (await rows("admin_users")).map((r) => ({
      _id: Number(r.id),
      username: str(r.username),
      email: str(r.email),
      password: str(r.password),
      bio: str(r.bio),
      profile_pic: str(r.profile_pic).replace(/^\.\.\//, ""),
      role: str(r.role) === "main_admin" ? "main_admin" : "author",
      created_at: date(r.created_at),
    })),
    "admin_users",
  );

  // Settings (single row) — JSON / CSV columns become real arrays
  const s = (await rows("settings"))[0] || {};
  const parseBanners = (v: unknown) => {
    try {
      const a = JSON.parse(str(v) || "[]");
      return Array.isArray(a) ? a.filter((b) => b && b.img) : [];
    } catch {
      return [];
    }
  };
  const settings: Record<string, unknown> = { _id: 1 };
  for (const [k, v] of Object.entries(s)) {
    if (k === "id") continue;
    settings[k] = v === null ? "" : v;
  }
  for (const k of ["maintenance_mode", "community_coming_soon", "shop_coming_soon"]) settings[k] = bool(s[k]);
  settings.banner_mobile = parseBanners(s.banner_mobile);
  settings.banner_desktop = parseBanners(s.banner_desktop);
  settings.homepage_famous_ids = idList(s.homepage_famous_ids);
  for (const k of ["site_logo", "site_favicon", "homepage_featured_image"]) settings[k] = str(s[k]).replace(/^\.\.\//, "");
  // merge: PHP values win, settings that only exist in the new admin are kept
  await db.collection("settings").updateOne({ _id: 1 } as never, { $set: settings }, { upsert: true });
  console.log("  settings             merged");

  // Counters continue after the highest old id
  const cc = db.collection<{ _id: string; seq: number }>("counters");
  for (const [name, max] of Object.entries(counters)) {
    await cc.updateOne({ _id: name }, { $max: { seq: max } }, { upsert: true });
  }

  // Copy uploaded files (images/ + uploads/) into STORAGE_DIR if not there yet
  const legacy = path.resolve(process.env.LEGACY_UPLOAD_DIR || "../novels");
  const storage = path.resolve(process.env.STORAGE_DIR || "./storage");
  for (const dir of ["images", "uploads"]) {
    const from = path.join(legacy, dir);
    const to = path.join(storage, dir);
    if (fs.existsSync(from)) {
      fs.cpSync(from, to, { recursive: true, force: false, errorOnExist: false, filter: (src) => !/\.(php\d?|htaccess)$/i.test(src) });
      console.log(`  copied ${dir}/ → ${to}`);
    }
  }

  await my.end();
  await mongo.close();
  console.log("Done ✓");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
