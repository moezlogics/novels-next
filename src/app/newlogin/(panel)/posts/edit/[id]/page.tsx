import { notFound } from "next/navigation";
import { col } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import PostForm from "@/components/admin/PostForm";
import { Flash } from "@/components/admin/Fields";

export const metadata = { title: "Edit Novel" };

export default async function EditPost({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const post = await (await col.posts()).findOne({ _id: parseInt(id, 10) });
  if (!post) notFound();
  const [cats, writers, series] = await Promise.all([
    (await col.categories()).find({}, { projection: { name: 1 } }).sort({ name: 1 }).toArray(),
    (await col.writers()).find({}, { projection: { name: 1 } }).sort({ name: 1 }).toArray(),
    (await col.series()).find({}).sort({ name: 1 }).toArray(),
  ]);
  return (
    <>
      <Flash ok={sp.ok} err={sp.err} />
      <PostForm key={`${post._id}-${post.updated_at?.toString()}`} post={post} cats={cats.map((c) => ({ id: c._id, name: c.name }))} writers={writers.map((w) => ({ id: w._id, name: w.name }))} series={series.map((s) => ({ id: s._id, name: s.name }))} />
    </>
  );
}
