import "@/styles/shop.css";
import "@/styles/single.css";
import type { ReactNode } from "react";
import HtmlShell from "@/components/HtmlShell";
import MobileNav from "@/components/site/MobileNav";

export const metadata = { robots: "noindex, nofollow" };

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <HtmlShell bodyClass="bg-white font-sans text-slate-800 antialiased has-mobile-nav page-shop-app">
      <main id="app-container">{children}</main>
      <MobileNav />
    </HtmlShell>
  );
}
