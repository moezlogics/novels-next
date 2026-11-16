import { notFound } from "next/navigation";
import { col } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import TermEdit from "@/components/admin/TermEdit";

export const metadata = { title: "Edit Category" };

export default async function EditCategory({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const c = await (await col.categories()).findOne({ _id: parseInt(id, 10) });
  if (!c) notFound();
  return <TermEdit kind="categories" term={{ id: c._id, name: c.name, slug: c.slug, description: c.description, image: c.image, meta_title: c.meta_title, meta_description: c.meta_description }} {...sp} />;
}
