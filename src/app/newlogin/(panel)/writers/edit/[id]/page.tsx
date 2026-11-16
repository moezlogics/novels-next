import { notFound } from "next/navigation";
import { col } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import TermEdit from "@/components/admin/TermEdit";

export const metadata = { title: "Edit Writer" };

export default async function EditWriter({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const w = await (await col.writers()).findOne({ _id: parseInt(id, 10) });
  if (!w) notFound();
  return <TermEdit kind="writers" term={{ id: w._id, name: w.name, slug: w.slug, description: w.bio, short_bio: w.short_bio, image: w.profile_pic, meta_title: w.meta_title, meta_description: w.meta_description }} {...sp} />;
}
