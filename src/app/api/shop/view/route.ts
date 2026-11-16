import { col } from "@/lib/db";
import { recordProductView } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const id = parseInt(String(b.id), 10);
  if (!(id > 0)) return new Response(null, { status: 204 });
  // ignore obvious bots
  if (/bot|crawl|spider|preview|lighthouse/i.test(req.headers.get("user-agent") || "")) return new Response(null, { status: 204 });
  const p = await (await col.products()).findOne({ _id: id, status: "active" }, { projection: { seller_id: 1 } });
  if (p) await recordProductView({ id, seller_id: p.seller_id ?? null }).catch(() => {});
  return new Response(null, { status: 204 });
}
