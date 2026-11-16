import "@/styles/community.css";
import type { ReactNode } from "react";
import HtmlShell from "@/components/HtmlShell";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import MobileNav from "@/components/site/MobileNav";

export default function CommunityLayout({ children }: { children: ReactNode }) {
  return (
    <HtmlShell bodyClass="bg-white font-sans text-slate-800 antialiased has-mobile-nav comm-app-page">
      <Header />
      <main id="app-container">{children}</main>
      <Footer />
      <MobileNav />
    </HtmlShell>
  );
}
