import { getArchive } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const f = {
    categoryId: parseInt(sp.get("category") || "", 10) || undefined,
    writerId: parseInt(sp.get("writer") || "", 10) || undefined,
    search: (sp.get("search") || "").slice(0, 100) || undefined,
  };
  const data = await getArchive(f, page, 12);
  return Response.json(data, { headers: { "Cache-Control": "public, max-age=120" } });
}
