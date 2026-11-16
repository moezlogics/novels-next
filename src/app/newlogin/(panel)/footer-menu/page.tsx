import { col } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import MenuEditor from "@/components/admin/MenuEditor";

export const metadata = { title: "Footer Menu" };

export default async function FooterMenu({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requireAdmin(true);
  const items = await (await col.footerMenu()).find({}).toArray();
  return <MenuEditor kind="footerMenu" title="Footer links (items with children become columns)" items={items} {...await searchParams} />;
}
