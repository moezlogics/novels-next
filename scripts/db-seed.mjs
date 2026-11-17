/**
 * Export / import the entire MongoDB database to/from `data/seed.ejson`.
 *
 *   npm run db:export                 # local MongoDB → data/seed.ejson (commit & deploy this file)
 *   npm run db:import                 # data/seed.ejson → MongoDB (replaces collections with the snapshot)
 *   npm run db:import -- --if-empty   # only import when the database has no posts/settings yet
 */
import fs from "node:fs";
import path from "node:path";
import { MongoClient, BSON } from "mongodb";

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv(path.resolve(".env.local"));
loadEnv(path.resolve(".env"));

const SEED_FILE = path.resolve("data/seed.ejson");

const COLLECTIONS = [
  "categories",
  "writers",
  "series",
  "posts",
  "pages",
  "comments",
  "members",
  "member_interests",
  "community_posts",
  "community_likes",
  "community_comments",
  "community_stories",
  "community_story_episodes",
  "contact_queries",
  "media",
  "menu_items",
  "footer_menu_items",
  "products",
  "orders",
  "admin_users",
  "settings",
  "counters",
  "reading_progress",
  "sellers",
  "product_reviews",
  "redirects",
];

async function main() {
  const mode = process.argv[2] || "import";
  const ifEmpty = process.argv.includes("--if-empty");
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
  const dbName = process.env.MONGODB_DB || "novels";

  const client = await new MongoClient(uri).connect();
  const db = client.db(dbName);

  if (mode === "export") {
    const dump = {};
    console.log(`Exporting MongoDB (${dbName}) → ${SEED_FILE} …`);
    for (const name of COLLECTIONS) {
      const docs = await db.collection(name).find({}).toArray();
      dump[name] = docs;
      if (docs.length) console.log(`  ${name.padEnd(26)} ${docs.length}`);
    }
    fs.mkdirSync(path.dirname(SEED_FILE), { recursive: true });
    fs.writeFileSync(SEED_FILE, BSON.EJSON.stringify(dump, { relaxed: false }, 2), "utf8");
    const kb = Math.round(fs.statSync(SEED_FILE).size / 1024);
    console.log(`Saved ${SEED_FILE} (${kb} KB) ✓`);
  } else {
    if (!fs.existsSync(SEED_FILE)) {
      console.error(`Seed file not found: ${SEED_FILE}`);
      process.exit(1);
    }
    if (ifEmpty) {
      const [posts, settings] = await Promise.all([
        db.collection("posts").estimatedDocumentCount(),
        db.collection("settings").estimatedDocumentCount(),
      ]);
      if (posts > 0 || settings > 0) {
        console.log(`Database "${dbName}" already has data (${posts} posts). Skipping seed.`);
        await client.close();
        return;
      }
    }
    console.log(`Importing ${SEED_FILE} → MongoDB (${dbName}) …`);
    const raw = fs.readFileSync(SEED_FILE, "utf8");
    const dump = BSON.EJSON.parse(raw);
    for (const [name, docs] of Object.entries(dump)) {
      if (!Array.isArray(docs)) continue;
      const c = db.collection(name);
      await c.deleteMany({});
      if (docs.length) await c.insertMany(docs);
      if (docs.length) console.log(`  ${name.padEnd(26)} ${docs.length}`);
    }
    console.log("Database import complete ✓");
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
