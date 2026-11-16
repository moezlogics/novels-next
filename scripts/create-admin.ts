/**
 * Create or reset an admin user.
 *   npm run create-admin -- <username> <password> [email]
 */
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

for (const f of [".env.local", ".env"]) {
  const p = path.resolve(f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

async function main() {
  const [username, password, email] = process.argv.slice(2);
  if (!username || !password || password.length < 8) {
    console.log("Usage: npm run create-admin -- <username> <password (8+ chars)> [email]");
    process.exit(1);
  }
  const client = await new MongoClient(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017").connect();
  const db = client.db(process.env.MONGODB_DB || "novels");
  const admins = db.collection<{ _id: number; username: string; email: string; password: string; role: string; bio: string; profile_pic: string; created_at: Date }>("admin_users");
  const hash = await bcrypt.hash(password, 10);
  const existing = await admins.findOne({ username });
  if (existing) {
    await admins.updateOne({ _id: existing._id }, { $set: { password: hash, role: "main_admin" } });
    console.log(`Password reset for "${username}" ✓`);
  } else {
    const c = await db.collection<{ _id: string; seq: number }>("counters").findOneAndUpdate({ _id: "admin_users" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
    await admins.insertOne({ _id: c!.seq, username, email: email || `${username}@example.com`, password: hash, role: "main_admin", bio: "", profile_pic: "", created_at: new Date() });
    console.log(`Admin "${username}" created ✓`);
  }
  await client.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
