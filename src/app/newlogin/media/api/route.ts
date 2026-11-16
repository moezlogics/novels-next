import { getAdmin } from "@/lib/auth";
import { col } from "@/lib/db";
import { saveImage } from "@/lib/storage";
import { thumbUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  const filter = q ? { $or: [{ original_name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }, { alt_text: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }] } : {};
  const rows = await (await col.media()).find(filter).sort({ _id: -1 }).limit(120).toArray();
  return Response.json({ items: rows.map((m) => ({ id: m._id, path: m.path, alt: m.alt_text || "", thumb: thumbUrl(m.path, 200) })) });
}

export async function POST(req: Request) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const f = (await req.formData()).get("file");
  if (!(f instanceof File) || !f.size) return Response.json({ error: "No file" }, { status: 400 });
  try {
    const img = await saveImage(f);
    return Response.json({ item: { id: img.id, path: img.path, alt: f.name, thumb: thumbUrl(img.path, 200) } });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
