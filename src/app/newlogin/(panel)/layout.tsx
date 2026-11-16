import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin";
import { col } from "@/lib/db";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const a = await requireAdmin();
  const [pending, newMsgs, newOrders, books, sellers, reviews] = await Promise.all([
    (await col.comments()).countDocuments({ status: "pending" }),
    (await col.contact()).countDocuments({ status: "new" }),
    (await col.orders()).countDocuments({ status: "pending" }),
    (await col.products()).countDocuments({ status: "pending" }),
    (await col.sellers()).countDocuments({ status: "pending" }),
    (await col.reviews()).countDocuments({ status: "pending" }),
  ]);
  return (
    <AdminShell user={{ username: a.username, role: a.role, pic: a.profile_pic || "" }} badges={{ comments: pending, contact: newMsgs, orders: newOrders, books, sellers, reviews }}>
      {children}
    </AdminShell>
  );
}
