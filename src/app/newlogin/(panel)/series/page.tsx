import { col } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import TermList from "@/components/admin/TermList";

export const metadata = { title: "Series" };

export default async function SeriesPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [rows, counts] = await Promise.all([
    (await col.series()).find({}).sort({ name: 1 }).toArray(),
    (await col.posts()).aggregate<{ _id: number; n: number }>([{ $match: { series_id: { $ne: null } } }, { $group: { _id: "$series_id", n: { $sum: 1 } } }]).toArray(),
  ]);
  const cm = new Map(counts.map((c) => [c._id, c.n]));
  return <TermList kind="series" title="Series" rows={rows.map((r) => ({ id: r._id, name: r.name, slug: r.slug, count: cm.get(r._id) || 0 }))} {...sp} />;
}
