import { col } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { effectivePrice } from "@/lib/shop";

export const dynamic = "force-dynamic";

/** Cart lookup: current price, stock and who ships each book (for per-seller shipping). */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") || "")
    .split(",")
    .map((x) => parseInt(x, 10))
    .filter((x) => x > 0)
    .slice(0, 50);
  const rows = ids.length ? await (await col.products()).find({ _id: { $in: ids }, status: "active" }).toArray() : [];
  const sellerIds = [...new Set(rows.map((p) => p.seller_id).filter((x): x is number => !!x))];
  const [s, sellers] = await Promise.all([getSettings(), sellerIds.length ? (await col.sellers()).find({ _id: { $in: sellerIds }, status: "active" }).toArray() : []]);
  const sm = new Map(sellers.map((x) => [x._id, x]));
  return Response.json({
    max_qty: s.max_qty_per_item || 10,
    min_order: s.min_order_amount || 0,
    products: rows
      .filter((p) => !p.seller_id || sm.has(p.seller_id))
      .map((p) => {
        const sel = p.seller_id ? sm.get(p.seller_id) : null;
        return {
          id: p._id,
          title: p.title,
          slug: p.slug,
          image: p.image,
          stock: p.stock,
          effective: effectivePrice(p),
          seller_id: sel?._id || 0,
          seller_name: sel?.store_name || s.site_name,
          ship_fee: sel ? sel.shipping_fee || 0 : (s.shipping_fee ?? 150),
          free_over: sel ? sel.free_shipping_over || 0 : (s.free_shipping_over ?? 0),
        };
      }),
  });
}
