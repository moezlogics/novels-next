import { col } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import MenuEditor from "@/components/admin/MenuEditor";

export const metadata = { title: "Navigation Menu" };

export default async function Menu({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requireAdmin(true);
  const items = await (await col.menu()).find({}).toArray();
  return <MenuEditor kind="menu" title="Header menu" items={items} {...await searchParams} />;
}
