import "server-only";
import fs from "node:fs";
import path from "node:path";
import { MongoClient, BSON, type Db, type Document, type Collection } from "mongodb";
import type * as T from "./types";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB || "novels";

type G = typeof globalThis & { _knMongo?: Promise<MongoClient>; _knIndexes?: Promise<void> };
const g = globalThis as G;

function client(): Promise<MongoClient> {
  if (!g._knMongo) {
    g._knMongo = new MongoClient(uri, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 8000,
    }).connect();
    g._knMongo.catch(() => {
      g._knMongo = undefined;
    });
  }
  return g._knMongo;
}

export async function getDb(): Promise<Db> {
  const db = (await client()).db(dbName);
  if (!g._knIndexes) {
    g._knIndexes = ensureIndexes(db).catch((e) => {
      console.error("index setup failed", e);
      g._knIndexes = undefined;
    });
  }
  return db;
}

async function coll<D extends Document>(name: string): Promise<Collection<D>> {
  return (await getDb()).collection<D>(name);
}

export const col = {
  posts: () => coll<T.Post>("posts"),
  categories: () => coll<T.Category>("categories"),
  writers: () => coll<T.Writer>("writers"),
  series: () => coll<T.Series>("series"),
  pages: () => coll<T.Page>("pages"),
  comments: () => coll<T.Comment>("comments"),
  members: () => coll<T.Member>("members"),
  memberInterests: () => coll<T.MemberInterest>("member_interests"),
  communityPosts: () => coll<T.CommunityPost>("community_posts"),
  communityLikes: () => coll<T.CommunityLike>("community_likes"),
  communityComments: () => coll<T.CommunityComment>("community_comments"),
  stories: () => coll<T.Story>("community_stories"),
  storyEpisodes: () => coll<T.StoryEpisode>("community_story_episodes"),
  contact: () => coll<T.ContactQuery>("contact_queries"),
  media: () => coll<T.Media>("media"),
  menu: () => coll<T.MenuItem>("menu_items"),
  footerMenu: () => coll<T.MenuItem>("footer_menu_items"),
  products: () => coll<T.Product>("products"),
  orders: () => coll<T.Order>("orders"),
  admins: () => coll<T.AdminUser>("admin_users"),
  settings: () => coll<T.Settings>("settings"),
  counters: () => coll<{ _id: string; seq: number }>("counters"),
  progress: () => coll<T.ReadingProgress>("reading_progress"),
  sellers: () => coll<T.Seller>("sellers"),
  reviews: () => coll<T.ProductReview>("product_reviews"),
  redirects: () => coll<T.Redirect>("redirects"),
  productViews: () => coll<{ _id: string; product_id: number; seller_id: number | null; day: string; views: number }>("product_views"),
  loginAttempts: () => coll<{ _id: string; attempts: number; last: number }>("login_attempts"),
};

/** Auto-increment integer ids (keeps the old MySQL ids + URLs + localStorage keys working). */
export async function nextId(name: string): Promise<number> {
  const c = await col.counters();
  const r = await c.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return r?.seq ?? 1;
}

/** After importing rows with explicit ids, move the counter past the max id. */
export async function syncCounter(name: string, maxId: number) {
  const c = await col.counters();
  await c.updateOne({ _id: name }, { $max: { seq: maxId } }, { upsert: true });
}

async function autoSeedIfEmpty(db: Db) {
  try {
    const [postsCount, settingsCount] = await Promise.all([
      db.collection("posts").estimatedDocumentCount(),
      db.collection("settings").estimatedDocumentCount(),
    ]);
    if (postsCount > 0 || settingsCount > 0) return;
    const seedFile = path.resolve(process.cwd(), "data/seed.ejson");
    if (!fs.existsSync(seedFile)) return;
    console.log(`[db] Empty database detected — importing initial data from ${seedFile} …`);
    const dump = BSON.EJSON.parse(fs.readFileSync(seedFile, "utf8")) as Record<string, Record<string, unknown>[]>;
    for (const [name, docs] of Object.entries(dump)) {
      if (!Array.isArray(docs) || !docs.length) continue;
      const c = db.collection(name);
      if ((await c.estimatedDocumentCount()) === 0) {
        await c.insertMany(docs as never[], { ordered: false }).catch(() => {});
      }
    }
    console.log("[db] Initial database seed completed ✓");
  } catch (e) {
    console.error("[db] Auto-seed error:", e);
  }
}

async function ensureIndexes(db: Db) {
  await autoSeedIfEmpty(db);
  await Promise.all([
    db.collection("posts").createIndexes([
      { key: { slug: 1 }, unique: true },
      { key: { status: 1, _id: -1 } },
      { key: { writer_id: 1, status: 1 } },
      { key: { category_ids: 1, status: 1 } },
      { key: { series_id: 1, season_number: 1 } },
      { key: { title: "text", description: "text" }, weights: { title: 10, description: 1 }, name: "post_text" },
    ]),
    db.collection("categories").createIndex({ slug: 1 }, { unique: true }),
    db.collection("writers").createIndex({ slug: 1 }, { unique: true }),
    db.collection("series").createIndex({ slug: 1 }, { unique: true }),
    db.collection("pages").createIndex({ slug: 1 }, { unique: true }),
    db.collection("comments").createIndexes([
      { key: { post_id: 1, status: 1 } },
      { key: { ip_address: 1, created_at: -1 } },
      { key: { msg_hash: 1, created_at: -1 }, sparse: true },
      { key: { status: 1, _id: -1 } },
    ]),
    db.collection("members").createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { username: 1 }, unique: true },
      { key: { google_id: 1 }, sparse: true },
    ]),
    db.collection("community_posts").createIndex({ created_at: -1 }),
    db.collection("community_likes").createIndex({ member_id: 1, post_id: 1 }, { unique: true }),
    db.collection("community_comments").createIndex({ post_id: 1 }),
    db.collection("community_stories").createIndexes([{ key: { updated_at: -1 } }, { key: { member_id: 1, updated_at: -1 } }]),
    db.collection("community_story_episodes").createIndex({ story_id: 1, n: 1 }, { unique: true }),
    db.collection("products").createIndexes([
      { key: { slug: 1 }, unique: true, sparse: true },
      { key: { status: 1, _id: -1 } },
      { key: { seller_id: 1, status: 1, _id: -1 } },
      { key: { status: 1, sold: -1 } },
      // books have a "language" field (Urdu…), so tell Mongo not to read it as the search language
      { key: { title: "text", author: "text", description: "text" }, weights: { title: 10, author: 5, description: 1 }, name: "product_text", default_language: "none", language_override: "text_language" },
    ]),
    db.collection("orders").createIndexes([
      { key: { member_id: 1 } },
      { key: { tracking_token: 1 } },
      { key: { seller_id: 1, created_at: -1 } },
      { key: { checkout_id: 1 } },
      { key: { status: 1, created_at: -1 } },
    ]),
    db.collection("sellers").createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { slug: 1 }, unique: true },
      { key: { status: 1, _id: -1 } },
    ]),
    db.collection("product_reviews").createIndexes([
      { key: { product_id: 1, status: 1, _id: -1 } },
      { key: { product_id: 1, member_id: 1 }, unique: true },
    ]),
    db.collection("redirects").createIndex({ from: 1 }, { unique: true }),
    db.collection("product_views").createIndex({ seller_id: 1, day: 1 }),
    db.collection("reading_progress").createIndex({ member_id: 1, post_id: 1 }, { unique: true }),
    db.collection("member_interests").createIndex({ member_id: 1, category_id: 1 }, { unique: true }),
  ]);
}
