import fs from "node:fs/promises";
import { storageDir } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Root-level .js files uploaded in Admin → Settings (e.g. LaraPush service worker). */
export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const name = (await ctx.params).name.replace(/[^\w.-]/g, "");
  if (!/\.js$/.test(name)) return new Response("Not found", { status: 404 });
  const js = await fs.readFile(storageDir("root", name), "utf8").catch(() => null);
  if (!js) return new Response("// not found", { status: 404, headers: { "Content-Type": "application/javascript" } });
  return new Response(js, { headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=3600", "Service-Worker-Allowed": "/" } });
}
