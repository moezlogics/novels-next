"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/seller/", label: "Home", icon: "fa-gauge-high", exact: true },
  { href: "/seller/products/", label: "My books", icon: "fa-book" },
  { href: "/seller/orders/", label: "Orders", icon: "fa-box" },
  { href: "/seller/store/", label: "Store", icon: "fa-store" },
  { href: "/seller/account/", label: "Account", icon: "fa-user" },
];

export default function SellerShell({ store, slug, site, newOrders, asAdmin, children }: { store: string; slug: string; site: string; newOrders: number; asAdmin: string; children: ReactNode }) {
  const path = usePathname() || "";
  const on = (n: (typeof NAV)[number]) => (n.exact ? path === n.href || path === n.href.slice(0, -1) : path.startsWith(n.href));
  const badge = (n: (typeof NAV)[number]) =>
    n.href === "/seller/orders/" && newOrders ? (
      <span className="sl-pill bad" style={{ padding: "1px 7px" }}>
        {newOrders}
      </span>
    ) : null;
  return (
    <>
      {asAdmin ? (
        <div className="sl-banner">
          <i className="fa-solid fa-user-shield"></i> You are viewing this seller&apos;s dashboard as admin ({asAdmin}). <a href="/newlogin/sellers/">Back to admin</a>
        </div>
      ) : null}
      <header className="sl-top">
        <Link href="/seller/" className="sl-brand">
          <span className="lg">
            <i className="fa-solid fa-store"></i>
          </span>
          <span>{store}</span>
        </Link>
        <div className="sp" />
        <nav className="sl-nav" aria-label="Seller">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={on(n) ? "on" : ""}>
              <i className={`fa-solid ${n.icon}`}></i> {n.label} {badge(n)}
            </Link>
          ))}
        </nav>
        <a href={`/shop/seller/${slug}/`} target="_blank" className="sl-btn ghost sm" title={`View my store on ${site}`}>
          <i className="fa-solid fa-arrow-up-right-from-square"></i>
          <span className="sl-hide-xs">My store</span>
        </a>
        <form action="/seller/logout/" method="POST">
          <button className="sl-btn ghost sm" title="Log out" aria-label="Log out">
            <i className="fa-solid fa-right-from-bracket"></i>
          </button>
        </form>
      </header>
      <main className="sl-main">{children}</main>
      <nav className="sl-bottom" aria-label="Seller">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={on(n) ? "on" : ""}>
            <i className={`fa-solid ${n.icon}`}></i>
            {n.label}
            {n.href === "/seller/orders/" && newOrders ? <span style={{ color: "#dc2626" }}>●</span> : null}
          </Link>
        ))}
      </nav>
    </>
  );
}
