import { col } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import PostForm from "@/components/admin/PostForm";
import { Flash } from "@/components/admin/Fields";

export const metadata = { title: "Add Novel" };

export default async function NewPost({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [cats, writers, series] = await Promise.all([
    (await col.categories()).find({}, { projection: { name: 1 } }).sort({ name: 1 }).toArray(),
    (await col.writers()).find({}, { projection: { name: 1 } }).sort({ name: 1 }).toArray(),
    (await col.series()).find({}).sort({ name: 1 }).toArray(),
  ]);
  return (
    <>
      <Flash ok={sp.ok} err={sp.err} />
      <PostForm cats={cats.map((c) => ({ id: c._id, name: c.name }))} writers={writers.map((w) => ({ id: w._id, name: w.name }))} series={series.map((s) => ({ id: s._id, name: s.name }))} />
    </>
  );
}
