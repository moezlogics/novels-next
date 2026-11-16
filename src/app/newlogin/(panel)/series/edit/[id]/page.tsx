import { notFound } from "next/navigation";
import { col } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import TermEdit from "@/components/admin/TermEdit";

export const metadata = { title: "Edit Series" };

export default async function EditSeries({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const s = await (await col.series()).findOne({ _id: parseInt(id, 10) });
  if (!s) notFound();
  return <TermEdit kind="series" term={{ id: s._id, name: s.name, slug: s.slug }} {...sp} />;
}
