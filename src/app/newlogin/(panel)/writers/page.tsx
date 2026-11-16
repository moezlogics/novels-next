import { col } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import TermList from "@/components/admin/TermList";

export const metadata = { title: "Writers" };

export default async function Writers({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [rows, counts] = await Promise.all([
    (await col.writers()).find({}).sort({ name: 1 }).toArray(),
    (await col.posts()).aggregate<{ _id: number; n: number }>([{ $group: { _id: "$writer_id", n: { $sum: 1 } } }]).toArray(),
  ]);
  const cm = new Map(counts.map((c) => [c._id, c.n]));
  return <TermList kind="writers" title="Writer" rows={rows.map((r) => ({ id: r._id, name: r.name, slug: r.slug, image: r.profile_pic, count: cm.get(r._id) || 0 }))} {...sp} />;
}
