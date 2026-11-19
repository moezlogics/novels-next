"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Ico from "../Icons";

/**
 * Bottom navigation — Home · Categories · Community · Shop · Account. Sections that are
 * "coming soon" are left out. "Categories" opens a small sheet with every category.
 */
export default function MobileNav({ community = false, shop = true, cats = [] }: { community?: boolean; shop?: boolean; cats?: { name: string; slug: string }[] }) {
  const path = usePathname() || "/";
  const [sheet, setSheet] = useState(false);
  useEffect(() => setSheet(false), [path]);
  useEffect(() => {
    if (!sheet) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [sheet]);
  if (/^\/shop\/(cart|checkout|success)(\/|$)/.test(path)) return null;
  const onCat = cats.some((c) => path === `/${c.slug}/` || path.startsWith(`/${c.slug}/page/`));
  const active = sheet || onCat ? "categories" : path === "/" ? "home" : path.startsWith("/account") || path.startsWith("/login") || path.startsWith("/register") ? "account" : path.startsWith("/shop") ? "shop" : path.startsWith("/community") ? "community" : "";
  const item = (key: string, href: string, icon: string, label: string, rel?: string) => (
    <Link href={href} className={active === key ? "active" : ""} aria-current={active === key ? "page" : undefined} rel={rel}>
      <Ico name={icon} />
      <span>{label}</span>
    </Link>
  );
  return (
    <>
      <nav className="site-mobile-nav" aria-label="Main navigation">
        {item("home", "/", "home", "Home")}
        {cats.length ? (
          <button type="button" className={active === "categories" ? "active" : ""} onClick={() => setSheet((v) => !v)} aria-expanded={sheet} aria-controls="kn-cat-sheet">
            <Ico name="grid" />
            <span>Categories</span>
          </button>
        ) : null}
        {community ? item("community", "/community/", "people", "Community", "nofollow") : null}
        {shop ? item("shop", "/shop/", "shop", "Shop", "nofollow") : null}
        {item("account", "/account/", "user", "Account", "nofollow")}
      </nav>
      {sheet ? (
        <div className="kn-cat-sheet-wrap" onClick={() => setSheet(false)}>
          <div id="kn-cat-sheet" className="kn-cat-sheet" role="dialog" aria-label="Categories" onClick={(e) => e.stopPropagation()}>
            <div className="kn-cat-sheet-head">
              <b>Categories</b>
              <button type="button" onClick={() => setSheet(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="kn-cat-sheet-list">
              {cats.map((c) => (
                <Link key={c.slug} href={`/${c.slug}/`} prefetch={false} className={path === `/${c.slug}/` ? "on" : ""}>
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
