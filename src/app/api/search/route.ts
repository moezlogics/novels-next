import { liveSearch } from "@/lib/data";
import { placeholderCover, thumbUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") || "";
  const hits = await liveSearch(q, 12);
  return Response.json(
    hits.map((h) => ({ title: h.title, writer_name: h.writer_name, link: `/${h.slug}/`, img: h.image ? thumbUrl(h.image, 200) : placeholderCover(h.title) })),
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
