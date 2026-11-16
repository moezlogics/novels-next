import "@/styles/icons-account.css";
import "@/styles/account_app.css";
import "@/styles/auth.css";
import "@/styles/account.css";
import type { ReactNode } from "react";
import HtmlShell from "@/components/HtmlShell";
import MobileNav from "@/components/site/MobileNav";

export const metadata = { robots: "noindex, nofollow" };

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <HtmlShell bodyClass="bg-white font-sans text-slate-800 antialiased has-mobile-nav page-account-app">
      <main id="app-container">{children}</main>
      <MobileNav />
    </HtmlShell>
  );
}
