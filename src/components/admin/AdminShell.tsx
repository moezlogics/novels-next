"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const A = "/newlogin";

interface Item {
  label: string;
  icon: string;
  href?: string;
  children?: { label: string; href: string; badge?: number; also?: string[] }[];
  main?: boolean;
}

export default function AdminShell({ user, badges, children }: { user: { username: string; role: string; pic: string }; badges: { comments: number; contact: number; orders: number; books: number; sellers: number; reviews: number }; children: ReactNode }) {
  const path = usePathname() || "";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const isMain = user.role === "main_admin";

  const menu: Item[] = [
    { label: "Dashboard", icon: "fa-gauge", href: `${A}/dashboard/` },
    {
      label: "Novels",
      icon: "fa-book",
      children: [
        { label: "All Novels", href: `${A}/posts/`, also: [`${A}/posts/edit`] },
        { label: "Add New", href: `${A}/posts/new/` },
        { label: "Categories", href: `${A}/categories/` },
        { label: "Writers", href: `${A}/writers/` },
        { label: "Series", href: `${A}/series/` },
        { label: "Comments", href: `${A}/comments/`, badge: badges.comments },
        { label: "Contact Messages", href: `${A}/contact/`, badge: badges.contact },
      ],
    },
    { label: "Pages", icon: "fa-file-lines", children: [{ label: "All Pages", href: `${A}/pages/`, also: [`${A}/pages/edit`] }, { label: "Add New", href: `${A}/pages/new/` }] },
    {
      label: "Bookstore",
      icon: "fa-store",
      children: [
        { label: "Products", href: `${A}/products/` },
        { label: "Books in review", href: `${A}/products/?status=pending`, badge: badges.books },
        { label: "Orders", href: `${A}/orders/`, badge: badges.orders },
        { label: "Sellers", href: `${A}/sellers/`, badge: badges.sellers, also: [`${A}/sellers/`] },
        { label: "Book reviews", href: `${A}/reviews/`, badge: badges.reviews },
      ],
    },
    { label: "Members", icon: "fa-users", href: `${A}/members/` },
    { label: "Community", icon: "fa-comments", href: `${A}/community/` },
    { label: "Media", icon: "fa-image", href: `${A}/media/` },
    {
      label: "Appearance",
      icon: "fa-palette",
      main: true,
      children: [
        { label: "Theme Colors", href: `${A}/theme/` },
        { label: "Navigation Menu", href: `${A}/menu/` },
        { label: "Footer Menu", href: `${A}/footer-menu/` },
        { label: "Page Content", href: `${A}/page-content/` },
        { label: "Famous Novels", href: `${A}/famous/` },
        { label: "Banners", href: `${A}/banners/` },
      ],
    },
    { label: "Settings", icon: "fa-gear", href: `${A}/settings/`, main: true },
    { label: "SEO Health", icon: "fa-magnifying-glass-chart", href: `${A}/seo/`, main: true },
    { label: "Redirects", icon: "fa-route", href: `${A}/redirects/`, main: true },
    { label: "Tools & Cache", icon: "fa-screwdriver-wrench", href: `${A}/tools/`, main: true },
    { label: "Account", icon: "fa-user", children: [{ label: "My Profile", href: `${A}/profile/` }, ...(isMain ? [{ label: "Manage Users", href: `${A}/users/` }] : [])] },
  ].filter((m) => !m.main || isMain);

  const active = (href: string, also: string[] = []) => path === href || path.startsWith(href) || also.some((a) => path.startsWith(a));
  const subActive = (href: string, also: string[] = []) => path === href || also.some((a) => path.startsWith(a));
  const title = (() => {
    for (const m of menu) {
      if (m.href && active(m.href)) return m.label;
      for (const c of m.children || []) if (subActive(c.href, c.also)) return c.label;
    }
    return "Admin";
  })();

  return (
    <div className={`adm${open ? " nav-open" : ""}`}>
      <div className="adm-overlay" onClick={() => setOpen(false)} />
      <nav className="adm-side" aria-label="Admin">
        <div className="adm-brand">
          <span className="logo">
            <i className="fa-solid fa-book"></i>
          </span>
          Admin Panel
        </div>
        <div className="adm-me">
          {user.pic ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/${user.pic.replace(/^\/+/, "")}`} alt="" className="adm-av" />
          ) : (
            <span className="adm-av">{user.username.charAt(0).toUpperCase()}</span>
          )}
          <div>
            <b>{user.username}</b>
            <small>{user.role.replace("_", " ")}</small>
          </div>
        </div>
        <div className="adm-nav">
          {menu.map((m) =>
            m.href ? (
              <Link key={m.label} href={m.href} className={`adm-link${active(m.href) ? " on" : ""}`}>
                <i className={`fa-solid ${m.icon}`}></i> {m.label}
              </Link>
            ) : (
              <details key={m.label} className="adm-group" open={m.children!.some((c) => active(c.href, c.also)) || undefined}>
                <summary>
                  <i className={`fa-solid ${m.icon}`}></i> {m.label}
                  {m.children!.some((c) => c.badge) ? <span className="adm-badge" style={{ marginLeft: "auto" }}>{m.children!.reduce((a, c) => a + (c.badge || 0), 0)}</span> : null}
                  <i className="fa-solid fa-chevron-right chev"></i>
                </summary>
                <div className="adm-sub">
                  {m.children!.map((c) => (
                    <Link key={c.href} href={c.href} className={subActive(c.href, c.also) ? "on" : ""}>
                      {c.label}
                      {c.badge ? <span className="adm-badge">{c.badge}</span> : null}
                    </Link>
                  ))}
                </div>
              </details>
            ),
          )}
          <form action="/newlogin/logout/" method="POST" style={{ marginTop: 14 }}>
            <button className="adm-link" style={{ width: "100%", border: 0, background: "none", font: "inherit", color: "#fca5a5" }}>
              <i className="fa-solid fa-right-from-bracket"></i> Logout
            </button>
          </form>
          <a href="/" target="_blank" className="adm-link">
            <i className="fa-solid fa-globe"></i> View Live Site
          </a>
        </div>
      </nav>
      <div className="adm-main">
        <header className="adm-top">
          <button className="a-btn a-btn-g a-btn-sm adm-burger" onClick={() => setOpen(true)} aria-label="Menu">
            <i className="fa-solid fa-bars"></i>
          </button>
          <h1>{title}</h1>
          <a href="/" target="_blank" className="a-btn a-btn-g a-btn-sm">
            <i className="fa-solid fa-globe"></i> <span>View Site</span>
          </a>
        </header>
        <div className="adm-body">{children}</div>
      </div>
    </div>
  );
}
