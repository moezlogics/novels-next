import { col, nextId } from "@/lib/db";
import { getMember } from "@/lib/auth";
import { contactBlocks, plainText } from "@/lib/spamBrain";
import { moderate } from "@/lib/moderation";
import { bustShop } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

/** Product reviews: members only, one per book, same spam rules as sellers. */
export async function POST(req: Request) {
  const m = await getMember();
  if (!m) return Response.json({ error: "Please log in to review." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const pid = parseInt(String(b.product_id), 10);
  const rating = Math.max(1, Math.min(5, parseInt(String(b.rating), 10) || 0));
  const text = plainText(String(b.text || ""), 1000);
  if (!(pid > 0) || !rating) return Response.json({ error: "Choose a rating." }, { status: 400 });
  if (text.length < 5) return Response.json({ error: "Write a few words about the book." }, { status: 400 });
  const p = await (await col.products()).findOne({ _id: pid, status: "active" }, { projection: { seller_id: 1 } });
  if (!p) return Response.json({ error: "Book not found." }, { status: 404 });
  const blocks = contactBlocks({ Review: text });
  if (blocks.length) return Response.json({ error: blocks[0] }, { status: 400 });
  const mod = await moderate("comment", text);
  if (!mod.ok) return Response.json({ error: mod.reason }, { status: 400 });

  const reviews = await col.reviews();
  if (await reviews.findOne({ product_id: pid, member_id: m._id }, { projection: { _id: 1 } })) return Response.json({ error: "You already reviewed this book." }, { status: 409 });
  // buyers' reviews go live at once; others wait for the admin
  const bought = await (await col.orders()).findOne({ member_id: m._id, "items.product_id": pid, status: { $in: ["shipped", "completed"] } }, { projection: { _id: 1 } });
  const status = bought ? "approved" : "pending";
  await reviews.insertOne({ _id: await nextId("product_reviews"), product_id: pid, seller_id: p.seller_id ?? null, member_id: m._id, name: m.name, rating, text, status, created_at: new Date() });
  if (status === "approved") {
    const agg = await reviews.aggregate<{ avg: number; n: number }>([{ $match: { product_id: pid, status: "approved" } }, { $group: { _id: null, avg: { $avg: "$rating" }, n: { $sum: 1 } } }]).toArray();
    await (await col.products()).updateOne({ _id: pid }, { $set: { rating_avg: Math.round((agg[0]?.avg || 0) * 10) / 10, rating_count: agg[0]?.n || 0 } });
    bustShop();
  }
  return Response.json({ ok: true, message: status === "approved" ? "Thank you! Your review is live." : "Thank you! Your review will appear after a quick check." });
}
