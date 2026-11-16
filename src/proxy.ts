import { NextResponse, type NextRequest } from "next/server";

/**
 * Old PHP URLs → new clean URLs (301), so Google rankings and old links keep working.
 * Lookups that need the database (single.php?id=, archive.php?category=…) are handled
 * by the /legacy/ route handler.
 */
const STATIC_MAP: Record<string, string> = {
  "/index.php": "/",
  "/home.php": "/",
  "/about.php": "/about/",
  "/about-us": "/about/",
  "/about-us/": "/about/",
  "/contact-us": "/contact/",
  "/contact-us/": "/contact/",
  "/contact.php": "/contact/",
  "/categories.php": "/categories/",
  "/community.php": "/community/",
  "/login.php": "/login/",
  "/register.php": "/register/",
  "/account.php": "/account/",
  "/my_orders.php": "/account/orders/",
  "/saved.php": "/",
  "/posts": "/",
  "/posts/": "/",
  "/posts.php": "/",
  "/scholarships": "/",
  "/signup": "/register/",
  "/signup/": "/register/",
  "/search.php": "/search/",
  "/shop/index.php": "/shop/",
  "/shop/cart.php": "/shop/cart/",
  "/shop/checkout.php": "/shop/checkout/",
  "/newlogin/index.php": "/newlogin/",
  "/newlogin/dashboard.php": "/newlogin/dashboard/",
  "/newlogin/manage.php": "/newlogin/posts/",
  "/newlogin/add.php": "/newlogin/posts/new/",
};

/** Top-level sections that have their own pages (never a category/writer slug). */
const RESERVED = new Set(["search", "shop", "community", "categories", "about", "contact", "account", "login", "register", "newlogin", "seller", "saved", "api", "images", "uploads", "legacy", "rootfile"]);

const LEGACY_DB = new Set(["/single.php", "/archive.php", "/page.php", "/reader.php", "/community_post.php", "/community_profile.php", "/shop/product.php", "/shop/success.php"]);

export function proxy(req: NextRequest) {
  const url = new URL(req.url);
  const { pathname, search } = url;
  const host = req.headers.get("host") || "";

  // www → apex (same as .htaccess)
  if (host.startsWith("www.")) {
    url.host = host.slice(4);
    return NextResponse.redirect(url.toString(), 301);
  }

  const lower = pathname.toLowerCase();
  const target = STATIC_MAP[lower];
  if (target) return NextResponse.redirect(new URL(target + search, req.url).toString(), 301);

  if (LEGACY_DB.has(lower)) {
    const qs = new URLSearchParams(search);
    qs.set("from", lower);
    return NextResponse.rewrite(new URL(`/legacy/?${qs}`, req.url).toString());
  }

  // PHP's paginated archives /<category-or-writer>/?page=N: serve the cached page route,
  // the address stays the same. ?page=1 (or junk) → the clean first page.
  const pg = url.searchParams.get("page");
  const one = /^\/([a-z0-9][a-z0-9-]*)\/$/.exec(pathname);
  if (one && pg !== null && !RESERVED.has(one[1])) {
    const n = parseInt(pg, 10);
    if (!(n > 1) || String(n) !== pg) return NextResponse.redirect(new URL(`/${one[1]}/`, req.url).toString(), 301);
    return NextResponse.rewrite(new URL(`/${one[1]}/page/${n}/`, req.url).toString());
  }
  // the internal address itself is never a public URL
  const internal = /^\/([a-z0-9][a-z0-9-]*)\/page\/(\d+)\/?$/.exec(pathname);
  if (internal) return NextResponse.redirect(new URL(`/${internal[1]}/?page=${internal[2]}`, req.url).toString(), 301);

  // Root .js files uploaded from admin (LaraPush firebase-messaging-sw.js etc.)
  if (/^\/[\w.-]+\.js$/.test(pathname)) return NextResponse.rewrite(new URL(`/rootfile/${pathname.slice(1)}/`, req.url).toString());

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/|images/|uploads/|favicon.ico).*)"],
};
