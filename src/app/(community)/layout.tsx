import "@/styles/icons-community.css";
import "@/styles/community.css";
import type { ReactNode } from "react";
import HtmlShell from "@/components/HtmlShell";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import MobileNav from "@/components/site/MobileNav";
import { getSettings } from "@/lib/settings";

export default async function CommunityLayout({ children }: { children: ReactNode }) {
  const s = await getSettings();
  return (
    <HtmlShell bodyClass="bg-white font-sans text-slate-800 antialiased has-mobile-nav comm-app-page">
      <Header />
      <main id="app-container">{children}</main>
      <Footer />
      <MobileNav community={!s.community_coming_soon} shop={!s.shop_coming_soon} />
    </HtmlShell>
  );
}
