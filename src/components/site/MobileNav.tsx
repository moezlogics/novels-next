"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Ico from "../Icons";

/** Bottom navigation — Home · Categories · Shop · Account (hidden on cart/checkout/success). */
export default function MobileNav() {
  const path = usePathname() || "/";
  if (/^\/shop\/(cart|checkout|success)(\/|$)/.test(path)) return null;
  const active = path === "/" ? "home" : path.startsWith("/categories") ? "categories" : path.startsWith("/account") || path.startsWith("/login") || path.startsWith("/register") ? "account" : path.startsWith("/shop") ? "shop" : "";
  const item = (key: string, href: string, icon: string, label: string, rel?: string) => (
    <Link href={href} className={active === key ? "active" : ""} aria-current={active === key ? "page" : undefined} rel={rel}>
      <Ico name={icon} />
      <span>{label}</span>
    </Link>
  );
  return (
    <nav className="site-mobile-nav" aria-label="Main navigation">
      {item("home", "/", "home", "Home")}
      {item("categories", "/categories/", "grid", "Categories")}
      {item("shop", "/shop/", "shop", "Shop", "nofollow")}
      {item("account", "/account/", "user", "Account", "nofollow")}
    </nav>
  );
}
