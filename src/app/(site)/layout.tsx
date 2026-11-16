import "@/styles/icons-site.css";
import type { ReactNode } from "react";
import HtmlShell from "@/components/HtmlShell";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import MobileNav from "@/components/site/MobileNav";
import Maintenance from "@/components/site/Maintenance";
import ReaderHost from "@/components/reader/ReaderHost";
import { getSettings } from "@/lib/settings";

export const revalidate = 3600;

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const s = await getSettings();
  return (
    <HtmlShell bodyClass="bg-white font-sans text-slate-800 antialiased has-mobile-nav">
      {s.maintenance_mode ? (
        <Maintenance message={s.maintenance_message} />
      ) : (
        <>
          <Header />
          <main id="app-container">{children}</main>
          <Footer />
          <MobileNav />
          {/* the novel reader stays alive while the visitor moves between pages */}
          <ReaderHost />
        </>
      )}
    </HtmlShell>
  );
}
