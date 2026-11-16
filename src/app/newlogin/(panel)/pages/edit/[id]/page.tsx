import { notFound } from "next/navigation";
import { col } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import PageForm from "@/components/admin/PageForm";
import { Flash } from "@/components/admin/Fields";

export const metadata = { title: "Edit Page" };

export default async function EditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requireAdmin();
  const page = await (await col.pages()).findOne({ _id: parseInt((await params).id, 10) });
  if (!page) notFound();
  return (
    <>
      <Flash {...await searchParams} />
      <PageForm key={page.updated_at?.toString()} page={page} />
    </>
  );
}
