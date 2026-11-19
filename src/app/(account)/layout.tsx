import "@/styles/icons-account.css";
import "@/styles/account_app.css";
import "@/styles/auth.css";
import "@/styles/account.css";
import type { ReactNode } from "react";
import HtmlShell from "@/components/HtmlShell";
import MobileNav from "@/components/site/MobileNav";
import { getCarouselCategories } from "@/lib/data";
import { getSettings } from "@/lib/settings";

export const metadata = { robots: "noindex, nofollow" };

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const s = await getSettings();
  return (
    <HtmlShell bodyClass="bg-white font-sans text-slate-800 antialiased has-mobile-nav page-account-app">
      <main id="app-container">{children}</main>
      <MobileNav community={!s.community_coming_soon} shop={!s.shop_coming_soon} cats={(await getCarouselCategories()).map((c) => ({ name: c.name, slug: c.slug }))} />
    </HtmlShell>
  );
}
