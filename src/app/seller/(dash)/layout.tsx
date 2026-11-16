import type { ReactNode } from "react";
import { col } from "@/lib/db";
import { requireSeller } from "@/lib/sellerAuth";
import { getSettings } from "@/lib/settings";
import SellerShell from "@/components/seller/SellerShell";

export const dynamic = "force-dynamic";

export default async function SellerDash({ children }: { children: ReactNode }) {
  const [seller, s] = await Promise.all([requireSeller({ allowInactive: true }), getSettings()]);
  const newOrders = await (await col.orders()).countDocuments({ seller_id: seller._id, status: "pending" });
  return (
    <SellerShell store={seller.store_name} slug={seller.slug} site={s.site_name} newOrders={newOrders} asAdmin={seller.asAdmin}>
      {children}
    </SellerShell>
  );
}
