import { getCardsByIds } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Novel metadata for ids kept in localStorage (Saved / Continue reading). */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") || "")
    .split(",")
    .map((x) => parseInt(x, 10))
    .filter((x) => x > 0)
    .slice(0, 80);
  const cards = await getCardsByIds([...new Set(ids)]);
  const posts: Record<number, { id: number; title: string; slug: string; image: string; pages: number; writer: string; url: string }> = {};
  for (const c of cards) posts[c.id] = { id: c.id, title: c.title, slug: c.slug, image: c.image, pages: c.pages, writer: c.writer_name, url: `/${c.slug}/` };
  return Response.json({ posts }, { headers: { "Cache-Control": "private, max-age=120" } });
}
