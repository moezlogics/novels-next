import { cleanDriveId, pdfSize } from "@/lib/pdfCache";
import { col } from "@/lib/db";
import { driveDownloadUrl } from "@/lib/pdfConst";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ?info=1 → { size } of a Drive PDF (one tiny 1-byte probe to Google).
 * The size is saved on the novel so next time the reader needs no request at all.
 * Anything else → redirect to Google's own download (no bandwidth on our server).
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = cleanDriveId((await ctx.params).id);
  if (id.length < 10) return new Response("Invalid file id", { status: 400 });
  const url = new URL(req.url);

  if (url.searchParams.has("info")) {
    const size = await pdfSize(id);
    if (!size) return Response.json({ error: "Could not reach this PDF on Google Drive. Make sure it is shared publicly." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    (await col.posts()).updateMany({ read_online_url: { $regex: id }, pdf_size: { $ne: size } }, { $set: { pdf_size: size } }).catch(() => {});
    return Response.json({ size }, { headers: { "Cache-Control": "public, max-age=3600", "Cloudflare-CDN-Cache-Control": "public, max-age=3600" } });
  }
  return Response.redirect(driveDownloadUrl(id), 302);
}
