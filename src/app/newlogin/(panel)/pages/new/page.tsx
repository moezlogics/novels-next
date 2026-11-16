import { requireAdmin } from "@/lib/admin";
import PageForm from "@/components/admin/PageForm";
import { Flash } from "@/components/admin/Fields";

export const metadata = { title: "Add Page" };

export default async function NewPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requireAdmin();
  return (
    <>
      <Flash {...await searchParams} />
      <PageForm />
    </>
  );
}
