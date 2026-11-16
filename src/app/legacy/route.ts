import { col } from "@/lib/db";

export const dynamic = "force-dynamic";

function go(req: Request, path: string) {
  return Response.redirect(new URL(path, req.url), 301);
}

/** 301s for old PHP URLs that need a database lookup (rewritten here by proxy.ts). */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const sp = u.searchParams;
  // after a proxy rewrite req.url can still be the original /single.php?id=… URL
  const from = (sp.get("from") || u.pathname).toLowerCase();
  const id = parseInt(sp.get("id") || "", 10);
  const slug = (sp.get("slug") || "").toLowerCase();

  if (from === "/single.php" || from === "/reader.php") {
    const p = id ? await (await col.posts()).findOne({ _id: id }, { projection: { slug: 1 } }) : slug ? { slug } : null;
    if (p?.slug) return go(req, `/${p.slug}/${from === "/reader.php" ? "?read=1" : ""}`);
  }
  if (from === "/archive.php") {
    const cat = sp.get("category");
    const writer = sp.get("writer");
    const search = sp.get("search");
    if (cat) return go(req, `/${cat}/`);
    if (writer) return go(req, `/${writer}/`);
    if (search) return go(req, `/search/?search=${encodeURIComponent(search)}`);
  }
  if (from === "/page.php" && slug) return go(req, `/${slug}/`);
  if (from === "/community_post.php" && id) return go(req, `/community/post/${id}/`);
  if (from === "/community_profile.php") {
    const u = sp.get("username");
    if (u) return go(req, `/community/u/${encodeURIComponent(u)}/`);
  }
  if (from === "/shop/product.php") {
    const p = id ? await (await col.products()).findOne({ _id: id }, { projection: { slug: 1 } }) : null;
    if (p?.slug || slug) return go(req, `/shop/${p?.slug || slug}/`);
    return go(req, "/shop/");
  }
  if (from === "/shop/success.php") {
    const q = new URLSearchParams();
    if (sp.get("order")) q.set("order", sp.get("order")!);
    if (sp.get("id")) q.set("order", sp.get("id")!);
    if (sp.get("t")) q.set("t", sp.get("t")!);
    if (sp.get("token")) q.set("t", sp.get("token")!);
    return go(req, `/shop/success/?${q}`);
  }
  return go(req, "/");
}
