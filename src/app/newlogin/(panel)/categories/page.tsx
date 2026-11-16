import { col } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import TermList from "@/components/admin/TermList";

export const metadata = { title: "Categories" };

export default async function Categories({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [rows, counts] = await Promise.all([
    (await col.categories()).find({}).sort({ name: 1 }).toArray(),
    (await col.posts()).aggregate<{ _id: number; n: number }>([{ $unwind: "$category_ids" }, { $group: { _id: "$category_ids", n: { $sum: 1 } } }]).toArray(),
  ]);
  const cm = new Map(counts.map((c) => [c._id, c.n]));
  return <TermList kind="categories" title="Category" rows={rows.map((r) => ({ id: r._id, name: r.name, slug: r.slug, image: r.image, count: cm.get(r._id) || 0 }))} {...sp} />;
}
