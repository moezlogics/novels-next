import { notFound } from "next/navigation";
import { col } from "@/lib/db";
import { requireSeller } from "@/lib/sellerAuth";
import { getSettings } from "@/lib/settings";
import ProductForm from "@/components/seller/ProductForm";

export const metadata = { title: "Edit book" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const [seller, s, { id }] = await Promise.all([requireSeller(), getSettings(), params]);
  const p = await (await col.products()).findOne({ _id: parseInt(id, 10) || 0, seller_id: seller._id });
  if (!p) notFound();
  return (
    <>
      <h1 className="sl-h1">
        Edit book
        <span className="sp" />
        {p.status === "active" ? (
          <a className="sl-btn ghost sm" href={`/shop/${p.slug}/`} target="_blank">
            <i className="fa-solid fa-eye"></i> View in store
          </a>
        ) : null}
      </h1>
      {p.status === "rejected" ? (
        <div className="sl-alert err">
          <b>This book needs changes before it can go live:</b>
          <ul>
            {(p.review_reasons || ["Rejected by admin"]).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          Fix it and save again to send it for review.
        </div>
      ) : p.status === "pending" ? (
        <div className="sl-alert info">This book is waiting for admin review.</div>
      ) : null}
      <ProductForm
        init={{
          id: p._id,
          title: p.title,
          author: p.author,
          description: p.description,
          price: p.price,
          sale_price: p.sale_price,
          stock: p.stock,
          language: p.language,
          pages_count: p.pages_count,
          binding: p.binding,
          condition: p.condition,
          isbn: p.isbn,
          tags: p.tags,
          photos: [p.image, ...(p.gallery_images || [])].filter(Boolean),
          status: p.status,
        }}
        maxPhotos={s.seller_max_images ?? 6}
        minPrice={s.seller_min_price ?? 100}
        maxPrice={s.seller_max_price ?? 25000}
      />
    </>
  );
}
