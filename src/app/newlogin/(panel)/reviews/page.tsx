import Link from "next/link";
import { col } from "@/lib/db";
import { back, int, requireAdmin, str } from "@/lib/admin";
import { bustShop } from "@/lib/marketplace";
import { formatDate } from "@/lib/utils";
import { ConfirmButton, Flash } from "@/components/admin/Fields";

export const metadata = { title: "Book reviews" };

async function refreshRating(pid: number) {
  const agg = await (await col.reviews()).aggregate<{ avg: number; n: number }>([{ $match: { product_id: pid, status: "approved" } }, { $group: { _id: null, avg: { $avg: "$rating" }, n: { $sum: 1 } } }]).toArray();
  await (await col.products()).updateOne({ _id: pid }, { $set: { rating_avg: Math.round((agg[0]?.avg || 0) * 10) / 10, rating_count: agg[0]?.n || 0 } });
}

async function act(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = int(fd, "id") || 0;
  const reviews = await col.reviews();
  const r = await reviews.findOne({ _id: id });
  if (!r) back("/newlogin/reviews/", "Review not found", "err");
  if (str(fd, "a") === "approve") await reviews.updateOne({ _id: id }, { $set: { status: "approved" } });
  else await reviews.deleteOne({ _id: id });
  await refreshRating(r.product_id);
  bustShop();
  back("/newlogin/reviews/", str(fd, "a") === "approve" ? "Review approved ✓" : "Review deleted");
}

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; all?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const rows = await (await col.reviews()).find(sp.all ? {} : { status: "pending" }).sort({ _id: -1 }).limit(300).toArray();
  const products = await (await col.products()).find({ _id: { $in: [...new Set(rows.map((r) => r.product_id))] } }, { projection: { title: 1, slug: 1 } }).toArray();
  const pm = new Map(products.map((p) => [p._id, p]));
  return (
    <>
      <Flash {...sp} />
      <div className="a-tabs">
        <Link href="?" className={!sp.all ? "on" : ""}>
          Waiting
        </Link>
        <Link href="?all=1" className={sp.all ? "on" : ""}>
          All reviews
        </Link>
      </div>
      <p className="a-muted" style={{ fontSize: ".82rem" }}>
        Reviews from buyers who received the book go live at once. Others wait here.
      </p>
      {rows.length ? (
        rows.map((r) => (
          <div className="a-card" key={r._id} style={{ padding: 14 }}>
            <div className="a-row">
              <b>{r.name}</b>
              <span style={{ color: "#f59e0b" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              <span className="a-muted" style={{ fontSize: ".78rem" }}>
                on{" "}
                <a href={`/shop/${pm.get(r.product_id)?.slug || ""}/`} target="_blank">
                  {pm.get(r.product_id)?.title || `#${r.product_id}`}
                </a>{" "}
                · {formatDate(r.created_at)}
              </span>
              <span className="a-sp" />
              <span className={`a-pill ${r.status === "approved" ? "ok" : "warn"}`}>{r.status}</span>
            </div>
            <p style={{ margin: "8px 0", whiteSpace: "pre-line" }}>{r.text}</p>
            <form action={act} className="a-row" style={{ gap: 6 }}>
              <input type="hidden" name="id" value={r._id} />
              {r.status !== "approved" ? (
                <button className="a-btn a-btn-p a-btn-sm" name="a" value="approve">
                  <i className="fa-solid fa-check"></i> Approve
                </button>
              ) : null}
              <ConfirmButton name="a" value="delete" className="a-btn a-btn-d a-btn-sm" message="Delete this review?">
                <i className="fa-solid fa-trash-can"></i> Delete
              </ConfirmButton>
            </form>
          </div>
        ))
      ) : (
        <div className="a-card a-empty">
          <i className="fa-solid fa-star"></i>No reviews {sp.all ? "yet" : "waiting"}.
        </div>
      )}
    </>
  );
}
