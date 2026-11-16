import Link from "next/link";
import { col, nextId } from "@/lib/db";
import { back, bustSite, file, imageFrom, int, num, requireAdmin, str } from "@/lib/admin";
import { saveImage, saveVideo } from "@/lib/storage";
import { slugify, thumbUrl } from "@/lib/utils";
import { ConfirmButton, Flash, ImageField, RichText, Submit } from "@/components/admin/Fields";
import type { Product, ProductStatus } from "@/lib/types";
import { reviewProduct } from "@/lib/marketplace";
import { plainText } from "@/lib/spamBrain";

export const metadata = { title: "Products" };

async function save(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = int(fd, "id");
  const title = str(fd, "title", 255);
  if (!title) back("/newlogin/products/", "Title is required", "err");
  const products = await col.products();
  let slug = slugify(str(fd, "slug") || title) || "book";
  for (let n = 2; await products.findOne({ slug, ...(id ? { _id: { $ne: id } } : {}) }); n++) slug = `${slugify(title)}-${n}`;
  const existing = id ? await products.findOne({ _id: id }) : null;
  let gallery = existing?.gallery_images || [];
  const keep = fd.getAll("keep_gallery").map(String);
  gallery = gallery.filter((g) => keep.includes(g));
  for (const f of fd.getAll("gallery_files")) if (f instanceof File && f.size) gallery.push((await saveImage(f, { alt: title })).path);
  let video = bool2(fd, "remove_video") ? "" : existing?.video_url || "";
  const vf = file(fd, "video_file");
  if (vf) {
    try {
      video = await saveVideo(vf);
    } catch (e) {
      back("/newlogin/products/", (e as Error).message, "err");
    }
  }
  const price = num(fd, "price") || 0;
  const sale = num(fd, "sale_price");
  const doc: Omit<Product, "_id" | "created_at"> & { author: string; language: string; updated_at: Date } = {
    author: str(fd, "author", 120),
    language: str(fd, "language", 30),
    updated_at: new Date(),
    post_id: int(fd, "post_id"),
    title,
    slug,
    description: existing?.seller_id ? plainText(str(fd, "description"), 5000) : str(fd, "description"),
    price,
    sale_price: sale && sale > 0 && sale < price ? sale : null,
    stock: Math.max(0, int(fd, "stock") || 0),
    image: await imageFrom(fd, "image", title),
    gallery_images: gallery,
    video_url: video,
    status: (["active", "inactive", "pending", "rejected"].includes(str(fd, "status")) ? str(fd, "status") : "active") as ProductStatus,
    meta_title: str(fd, "meta_title", 255),
    meta_description: str(fd, "meta_description", 500),
  };
  if (existing && existing.seller_id && existing.status !== "active" && doc.status === "active") await reviewProduct(existing._id, true, "admin");
  if (existing) await products.updateOne({ _id: existing._id }, { $set: doc });
  else await products.insertOne({ _id: await nextId("products"), ...doc, created_at: new Date() });
  bustSite();
  back("/newlogin/products/", existing ? "Product updated ✓" : "Product added ✓");
}
function bool2(fd: FormData, k: string) {
  return fd.get(k) === "1";
}

async function review(fd: FormData) {
  "use server";
  const a = await requireAdmin();
  const id = int(fd, "id")!;
  const approve = str(fd, "a") === "approve";
  await reviewProduct(id, approve, a.username, str(fd, "reason", 300));
  back(`/newlogin/products/?status=pending`, approve ? "Approved — the book is live ✓" : "Rejected — the seller sees your reason");
}

async function remove(fd: FormData) {
  "use server";
  await requireAdmin();
  await (await col.products()).deleteOne({ _id: int(fd, "id")! });
  bustSite();
  back("/newlogin/products/", "Product deleted");
}

const TABS: { k: string; l: string }[] = [
  { k: "", l: "All" },
  { k: "pending", l: "In review" },
  { k: "active", l: "Live" },
  { k: "rejected", l: "Rejected" },
  { k: "inactive", l: "Hidden" },
];

export default async function Products({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; edit?: string; add?: string; status?: string; seller?: string; q?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = TABS.find((t) => t.k && t.k === sp.status)?.k || "";
  const sellerId = parseInt(sp.seller || "", 10) || 0;
  const term = (sp.q || "").trim().slice(0, 80);
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const q: Record<string, unknown> = {};
  if (status) q.status = status;
  if (sellerId === -1) q.seller_id = { $in: [null, 0] };
  else if (sellerId) q.seller_id = sellerId;
  if (term) q.title = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const products = await col.products();
  const [rows, total, counts, posts, sellers] = await Promise.all([
    products.find(q).sort(status === "pending" ? { updated_at: 1 } : { _id: -1 }).skip((page - 1) * 100).limit(100).toArray(),
    products.countDocuments(q),
    products.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
    (await col.posts()).find({}, { projection: { title: 1 } }).sort({ title: 1 }).toArray(),
    (await col.sellers()).find({}, { projection: { store_name: 1, slug: 1 } }).sort({ store_name: 1 }).toArray(),
  ]);
  const cnt = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  const sm = new Map(sellers.map((x) => [x._id, x]));
  const editing = sp.edit ? (rows.find((r) => r._id === parseInt(sp.edit!, 10)) || (await products.findOne({ _id: parseInt(sp.edit!, 10) || 0 }))) : null;
  const qs = (over: Record<string, string>) => {
    const u = new URLSearchParams({ ...(status ? { status } : {}), ...(sellerId ? { seller: String(sellerId) } : {}), ...(term ? { q: term } : {}), ...over });
    for (const [k, v] of [...u.entries()]) if (!v) u.delete(k);
    return `?${u}`;
  };
  const showForm = !!editing || sp.add === "1";
  return (
    <>
      <Flash ok={sp.ok} err={sp.err} />
      {showForm ? (
        <form action={save} className="a-card">
          <h3>
            <i className="fa-solid fa-store"></i> {editing ? `Edit: ${editing.title}` : "Add Product"}
          </h3>
          {editing ? <input type="hidden" name="id" value={editing._id} /> : null}
          <div className="a-main-side">
            <div>
              <div className="a-grid a-g2">
                <div className="a-field">
                  <label>Title *</label>
                  <input type="text" name="title" defaultValue={editing?.title} required />
                </div>
                <div className="a-field">
                  <label>Slug</label>
                  <input type="text" name="slug" defaultValue={editing?.slug} placeholder="auto" />
                </div>
              </div>
              <div className="a-grid a-g3">
                <div className="a-field">
                  <label>Price (Rs) *</label>
                  <input type="number" step="0.01" name="price" defaultValue={editing?.price} required />
                </div>
                <div className="a-field">
                  <label>Sale price</label>
                  <input type="number" step="0.01" name="sale_price" defaultValue={editing?.sale_price ?? ""} />
                </div>
                <div className="a-field">
                  <label>Stock</label>
                  <input type="number" name="stock" defaultValue={editing?.stock ?? 10} min={0} />
                </div>
              </div>
              <div className="a-grid a-g2">
                <div className="a-field">
                  <label>Writer / author</label>
                  <input type="text" name="author" defaultValue={editing?.author} />
                </div>
                <div className="a-field">
                  <label>Language</label>
                  <select name="language" defaultValue={editing?.language || "Urdu"}>
                    {["Urdu", "English", "Roman Urdu", "Punjabi", "Other"].map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="a-field">
                <label>Linked novel (shows &quot;Buy Hard Book&quot; on the novel page)</label>
                <select name="post_id" defaultValue={editing?.post_id ?? ""}>
                  <option value="">— None —</option>
                  {posts.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="a-field">
                <label>Description</label>
                {editing?.seller_id ? (
                  <textarea name="description" rows={8} defaultValue={editing.description || ""} />
                ) : (
                  <RichText name="description" defaultValue={editing?.description || ""} minHeight={220} />
                )}
              </div>
              <div className="a-grid a-g2">
                <div className="a-field">
                  <label>Meta title</label>
                  <input type="text" name="meta_title" defaultValue={editing?.meta_title} />
                </div>
                <div className="a-field">
                  <label>Meta description</label>
                  <input type="text" name="meta_description" defaultValue={editing?.meta_description} />
                </div>
              </div>
            </div>
            <div>
              <ImageField name="image" current={editing?.image} label="Main image" />
              <div className="a-field">
                <label>Gallery images</label>
                {editing?.gallery_images?.length ? (
                  <div className="a-row" style={{ marginBottom: 8 }}>
                    {editing.gallery_images.map((g) => (
                      <label key={g} style={{ position: "relative" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={thumbUrl(g, 200)} alt="" style={{ width: 56, height: 80, objectFit: "cover", borderRadius: 6 }} />
                        <input type="checkbox" name="keep_gallery" value={g} defaultChecked style={{ position: "absolute", top: 4, left: 4 }} />
                      </label>
                    ))}
                  </div>
                ) : null}
                <input type="file" name="gallery_files" accept="image/*" multiple />
                <small>Untick an image to remove it.</small>
              </div>
              <div className="a-field">
                <label>Video (MP4/WebM, max 50 MB)</label>
                {editing?.video_url ? (
                  <label className="a-check">
                    <input type="checkbox" name="remove_video" value="1" /> Remove current video
                  </label>
                ) : null}
                <input type="file" name="video_file" accept="video/mp4,video/webm,video/quicktime" />
              </div>
              <div className="a-field">
                <label>Status</label>
                <select name="status" defaultValue={editing?.status || "active"}>
                  <option value="active">Live</option>
                  <option value="inactive">Hidden</option>
                  <option value="pending">In review</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="a-row">
                <Submit>
                  <i className="fa-solid fa-floppy-disk"></i> Save product
                </Submit>
                <Link href="/newlogin/products/" className="a-btn a-btn-g">
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <>
          <div className="a-tabs" style={{ flexWrap: "wrap" }}>
            {TABS.map((t) => (
              <Link key={t.k || "all"} href={qs({ status: t.k, page: "" })} className={status === t.k ? "on" : ""}>
                {t.l} ({t.k ? cnt[t.k] || 0 : Object.values(cnt).reduce((a, b) => a + b, 0)})
              </Link>
            ))}
          </div>
          <form className="a-row" style={{ marginBottom: 12 }}>
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <input name="q" defaultValue={term} placeholder="Search title…" style={{ maxWidth: 240 }} />
            <select name="seller" defaultValue={sellerId || ""} style={{ maxWidth: 220 }}>
              <option value="">All sellers</option>
              <option value="-1">Site&apos;s own books</option>
              {sellers.map((x) => (
                <option key={x._id} value={x._id}>
                  {x.store_name}
                </option>
              ))}
            </select>
            <button className="a-btn a-btn-g a-btn-sm">Filter</button>
            <span className="a-sp" />
            <Link href="?add=1" className="a-btn a-btn-p">
              <i className="fa-solid fa-plus"></i> Add Product
            </Link>
          </form>
          {status === "pending" && rows.length ? (
            <div className="a-alert" style={{ marginBottom: 12 }}>
              <i className="fa-solid fa-shield-halved"></i> Review queue: oldest first. Each book shows why the spam brain held it. Approving also builds the seller&apos;s trust.
            </div>
          ) : null}
        </>
      )}
      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Seller</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div className="a-row" style={{ flexWrap: "nowrap" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbUrl(p.image, 200)} alt="" className="a-thumb" />
                      <div>
                        <b>{p.title}</b>
                        <div className="a-muted" style={{ fontSize: ".75rem" }}>
                          {p.author ? `${p.author} · ` : ""}/shop/{p.slug}/ · {p.views || 0} views · {Math.max(0, p.sold || 0)} sold
                        </div>
                        {p.status === "pending" || p.status === "rejected" ? (
                          <div style={{ fontSize: ".75rem", marginTop: 4 }}>
                            {(p.review_reasons || []).map((r) => (
                              <div key={r} style={{ color: p.status === "pending" ? "#fbbf24" : "#fca5a5" }}>
                                • {r}
                              </div>
                            ))}
                            {typeof p.spam_score === "number" ? <span className="a-muted">Spam score {p.spam_score}/100</span> : null}
                          </div>
                        ) : null}
                        {p.status === "pending" ? (
                          <div className="a-row" style={{ marginTop: 6, gap: 6 }}>
                            <form action={review}>
                              <input type="hidden" name="id" value={p._id} />
                              <button className="a-btn a-btn-p a-btn-xs" name="a" value="approve">
                                <i className="fa-solid fa-check"></i> Approve
                              </button>
                            </form>
                            <form action={review} className="a-row" style={{ gap: 4 }}>
                              <input type="hidden" name="id" value={p._id} />
                              <input name="reason" placeholder="Reason for the seller" style={{ maxWidth: 200, padding: "4px 8px", fontSize: ".8rem" }} />
                              <button className="a-btn a-btn-d a-btn-xs" name="a" value="reject">
                                <i className="fa-solid fa-xmark"></i> Reject
                              </button>
                            </form>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td>
                    {p.seller_id ? (
                      <Link href={`/newlogin/sellers/${p.seller_id}/`}>{sm.get(p.seller_id)?.store_name || `#${p.seller_id}`}</Link>
                    ) : (
                      <span className="a-muted">Site</span>
                    )}
                  </td>
                  <td>
                    {p.sale_price ? (
                      <>
                        <b>Rs {p.sale_price}</b> <s className="a-muted">Rs {p.price}</s>
                      </>
                    ) : (
                      <b>Rs {p.price}</b>
                    )}
                  </td>
                  <td>
                    <span className={`a-pill ${p.stock > 5 ? "ok" : p.stock > 0 ? "warn" : "bad"}`}>{p.stock}</span>
                  </td>
                  <td>
                    <span className={`a-pill ${p.status === "active" ? "ok" : p.status === "pending" ? "warn" : p.status === "rejected" ? "bad" : ""}`}>{p.status === "pending" ? "in review" : p.status}</span>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {p.status === "active" ? (
                      <a href={`/shop/${p.slug}/`} target="_blank" className="a-btn a-btn-g a-btn-xs" title="View">
                        <i className="fa-solid fa-eye"></i>
                      </a>
                    ) : null}{" "}
                    <Link href={`?edit=${p._id}`} className="a-btn a-btn-g a-btn-xs">
                      <i className="fa-solid fa-pen"></i> Edit
                    </Link>{" "}
                    <form action={remove} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={p._id} />
                      <ConfirmButton className="a-btn a-btn-d a-btn-xs" message="Delete this product?">
                        <i className="fa-solid fa-trash-can"></i>
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>
                  <div className="a-empty">
                    <i className="fa-solid fa-store"></i>No products yet — add printed books to sell.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {total > 100 ? (
        <div className="a-row" style={{ justifyContent: "center", marginTop: 12 }}>
          {page > 1 ? (
            <Link className="a-btn a-btn-g a-btn-sm" href={qs({ page: String(page - 1) })}>
              ‹ Prev
            </Link>
          ) : null}
          <span className="a-muted">
            Page {page} of {Math.ceil(total / 100)}
          </span>
          {page * 100 < total ? (
            <Link className="a-btn a-btn-g a-btn-sm" href={qs({ page: String(page + 1) })}>
              Next ›
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
