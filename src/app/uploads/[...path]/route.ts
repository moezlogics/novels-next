import { serveStorage } from "@/lib/serveFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const parts = (await ctx.params).path.map((p) => decodeURIComponent(p));
  return serveStorage(req, ["uploads", ...parts].join("/"));
}
