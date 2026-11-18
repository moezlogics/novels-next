import { serveSubSitemap, type SubSitemapKind } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

const KINDS = new Set<SubSitemapKind>(["posts", "categories", "writers", "pages", "shop"]);

export async function GET(_req: Request, ctx: { params: Promise<{ kind: string; page: string }> }) {
  const { kind, page } = await ctx.params;
  if (!KINDS.has(kind as SubSitemapKind) || !/^[1-9]\d*$/.test(page)) {
    return new Response("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  }
  return serveSubSitemap(kind as SubSitemapKind, parseInt(page, 10));
}
