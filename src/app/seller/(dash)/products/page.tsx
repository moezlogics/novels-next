import Link from "next/link";
import { col } from "@/lib/db";
import { requireSeller } from "@/lib/sellerAuth";
import { sellerProductAction } from "../../actions";
import { thumbUrl } from "@/lib/utils";
import Flash, { money } from "@/components/seller/Flash";
import type { ProductStatus } from "@/lib/types";

export const metadata = { title: "My books" };

const LABEL: Record<ProductStatus, [string, string]> = {
  active: ["Live", "ok"],
  inactive: ["Hidden", ""],
  pending: ["In review", "info"],
  rejected: ["Needs changes", "bad"],
};

export default async function SellerProducts({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; status?: string; q?: string }> }) {
  const [seller, sp] = await Promise.all([requireSeller(), searchParams]);
  const status = (["active", "inactive", "pending", "rejected"] as const).find((x) => x === sp.status);
  const q: Record<string, unknown> = { seller_id: seller._id };
  if (status) q.status = status;
  const term = (sp.q || "").trim().slice(0, 60);
  if (term) q.title = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const [rows, counts] = await Promise.all([
    (await col.products()).find(q).sort({ _id: -1 }).limit(300).toArray(),
    (await col.products()).aggregate<{ _id: string; n: number }>([{ $match: { seller_id: seller._id } }, { $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
  ]);
  const c = Object.fromEntries(counts.map((x) => [x._id, x.n]));
  const total = counts.reduce((a, x) => a + x.n, 0);
  return (
    <>
      <Flash ok={sp.ok} err={sp.err} />
      <h1 className="sl-h1">
        My books <span className="sp" />
        <Link className="sl-btn" href="/seller/products/new/">
          <i className="fa-solid fa-plus"></i> Add a book
        </Link>
      </h1>
      <div className="sl-tabs">
        <Link href="/seller/products/" className={!status ? "on" : ""}>
          All ({total})
        </Link>
        {(Object.keys(LABEL) as ProductStatus[]).map((k) => (
          <Link key={k} href={`/seller/products/?status=${k}`} className={status === k ? "on" : ""}>
            {LABEL[k][0]} ({c[k] || 0})
          </Link>
        ))}
      </div>
      <form style={{ marginBottom: 12 }}>
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <input name="q" defaultValue={term} placeholder="Search my books…" />
      </form>
      {rows.length ? (
        <div className="sl-list">
          {rows.map((p) => {
            const [label, tone] = LABEL[p.status] || ["?", ""];
            return (
              <div className="sl-item" key={p._id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image ? thumbUrl(p.image, 200) : "/images/kitab1-1.png"} alt="" />
                <div className="bd">
                  <b>{p.title}</b>
                  <div className="meta">
                    <span className={`sl-pill ${tone}`}>{label}</span>
                    <span>
                      {p.sale_price ? (
                        <>
                          <s>{money(p.price)}</s> {money(p.sale_price)}
                        </>
                      ) : (
                        money(p.price)
                      )}
                    </span>
                    <span style={{ color: p.stock <= 0 ? "#dc2626" : undefined }}>{p.stock <= 0 ? "Out of stock" : `${p.stock} in stock`}</span>
                    <span>{p.sold || 0} sold</span>
                    <span>{(p.views || 0).toLocaleString()} views</span>
                  </div>
                  {p.status === "rejected" && p.review_reasons?.length ? (
                    <div className="sl-small" style={{ color: "#991b1b", marginTop: 4 }}>
                      {p.review_reasons[0]}
                    </div>
                  ) : null}
                </div>
                <div className="act">
                  <form action={sellerProductAction} style={{ display: "flex", gap: 4 }}>
                    <input type="hidden" name="id" value={p._id} />
                    <input name="stock" type="number" min={0} defaultValue={p.stock} aria-label="Stock" style={{ width: 74, padding: "6px 8px" }} />
                    <button className="sl-btn ghost sm" name="a" value="stock" title="Save stock">
                      <i className="fa-solid fa-check"></i>
                    </button>
                  </form>
                  <Link className="sl-btn ghost sm" href={`/seller/products/${p._id}/`}>
                    <i className="fa-solid fa-pen"></i> Edit
                  </Link>
                  {p.status === "active" || p.status === "inactive" ? (
                    <form action={sellerProductAction}>
                      <input type="hidden" name="id" value={p._id} />
                      <button className="sl-btn ghost sm" name="a" value={p.status === "active" ? "hide" : "show"} title={p.status === "active" ? "Hide from store" : "Show in store"}>
                        <i className={`fa-solid ${p.status === "active" ? "fa-eye-slash" : "fa-eye"}`}></i>
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="sl-card sl-empty">
          <i className="fa-solid fa-book-open"></i>
          {total ? "No books match." : "You have not added any books yet."}
          <div style={{ marginTop: 12 }}>
            <Link className="sl-btn" href="/seller/products/new/">
              <i className="fa-solid fa-plus"></i> Add your first book
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
