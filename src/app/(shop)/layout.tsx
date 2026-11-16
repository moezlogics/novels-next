import "@/styles/icons-shop.css";
import "@/styles/shop.css";
import "@/styles/single.css";
import type { ReactNode } from "react";
import HtmlShell from "@/components/HtmlShell";
import MobileNav from "@/components/site/MobileNav";
import { getSettings } from "@/lib/settings";

export const metadata = { robots: "noindex, nofollow" };

export default async function ShopLayout({ children }: { children: ReactNode }) {
  const s = await getSettings();
  return (
    <HtmlShell bodyClass="bg-white font-sans text-slate-800 antialiased has-mobile-nav page-shop-app">
      <main id="app-container">{children}</main>
      <MobileNav community={!s.community_coming_soon} shop={!s.shop_coming_soon} />
    </HtmlShell>
  );
}
