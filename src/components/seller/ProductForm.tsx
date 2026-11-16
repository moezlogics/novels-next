"use client";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { sellerSaveProduct } from "@/app/seller/actions";
import { Errors, SubmitBtn } from "./SellerForms";

export interface ProductInit {
  id?: number;
  title?: string;
  author?: string;
  description?: string;
  price?: number;
  sale_price?: number | null;
  stock?: number;
  language?: string;
  pages_count?: number;
  binding?: string;
  condition?: string;
  isbn?: string;
  tags?: string[];
  photos?: string[]; // stored paths, cover first
  status?: string;
}

type Photo = { key: string; src: string; file?: File };

/** Same idea as the server brain, so sellers see the problem while typing. */
function quickWarn(text: string): string {
  const t = text.toLowerCase();
  const digits = text.replace(/[^\d]/g, "");
  if (/(?:\+?92|0)3\d{2}[\s.-]*\d{3}[\s.-]*\d{4}/.test(text) || digits.length >= 10) return "Looks like a phone number. Phone numbers are not allowed.";
  if (/https?:\/\/|www\.|\.com\b|\.pk\b|wa\.me|t\.me/.test(t)) return "Links are not allowed.";
  if (/@[a-z0-9_.]{3,}|gmail|yahoo|hotmail/.test(t)) return "Emails and @handles are not allowed.";
  if (/whats\s?app|watsap|telegram|inbox me|dm me|call me|easypaisa|jazz\s?cash/.test(t)) return "Contact and payment details are not allowed. Buyers order on the website.";
  return "";
}

const img = (p: string) => (p.startsWith("blob:") || p.startsWith("/") || /^https?:/.test(p) ? p : `/${p}`);

export default function ProductForm({ init, maxPhotos, minPrice, maxPrice }: { init: ProductInit; maxPhotos: number; minPrice: number; maxPrice: number }) {
  const [state, action] = useActionState(sellerSaveProduct, null);
  const v = state?.values || {};
  const [photos, setPhotos] = useState<Photo[]>(() => (init.photos || []).map((p) => ({ key: p, src: img(p) })));
  const [title, setTitle] = useState(init.title || "");
  const [desc, setDesc] = useState(init.description || "");
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (v.title !== undefined) setTitle(v.title);
    if (v.description !== undefined) setDesc(v.description);
  }, [v.title, v.description]);

  const warn = useMemo(() => quickWarn(`${title}\n${desc}`), [title, desc]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const room = maxPhotos - photos.length;
    const add = Array.from(list)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, Math.max(0, room))
      .map((f, i) => ({ key: `f${Date.now()}${i}`, src: URL.createObjectURL(f), file: f }));
    setPhotos((p) => [...p, ...add]);
  };

  // put the new files into the form in order, and tell the server the final photo order
  const beforeSubmit = (fd: FormData) => {
    fd.delete("photos");
    let n = 0;
    const order: string[] = [];
    for (const p of photos) {
      if (p.file) {
        fd.append("photos", p.file);
        order.push(`new:${n++}`);
      } else order.push(p.key);
    }
    fd.set("photo_order", order.join("|"));
    return action(fd);
  };

  const val = (k: string, d: unknown) => (v[k] !== undefined ? v[k] : d === null || d === undefined ? "" : String(d));

  return (
    <form ref={formRef} action={beforeSubmit}>
      <Errors state={state} />
      {init.id ? <input type="hidden" name="id" value={init.id} /> : null}

      <div className="sl-card">
        <h2>
          <i className="fa-solid fa-camera"></i> Photos{" "}
          <span className="sl-muted sl-small">
            ({photos.length}/{maxPhotos}) — the first photo is the cover
          </span>
        </h2>
        <div className="sl-photos">
          {photos.map((p, i) => (
            <div className="sl-photo" key={p.key}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt="" />
              {i === 0 ? (
                <span className="tag">Cover</span>
              ) : (
                <span className="tag" style={{ background: "#334155", cursor: "pointer" }} onClick={() => setPhotos((all) => [p, ...all.filter((x) => x !== p)])}>
                  Make cover
                </span>
              )}
              <button type="button" aria-label="Remove photo" onClick={() => setPhotos((all) => all.filter((x) => x !== p))}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          ))}
          {photos.length < maxPhotos ? (
            <label className="sl-add-photo">
              <i className="fa-solid fa-plus" style={{ fontSize: "1.2rem" }}></i>
              Add photos
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
            </label>
          ) : null}
        </div>
        <small className="sl-muted sl-small" style={{ display: "block", marginTop: 8 }}>
          Clear photos of the real book: front cover, back cover, inside pages. No text with phone numbers on the photos.
        </small>
      </div>

      <div className="sl-card">
        <h2>
          <i className="fa-solid fa-book"></i> Book details
        </h2>
        {warn ? (
          <div className="sl-alert warn" role="alert">
            <i className="fa-solid fa-triangle-exclamation"></i> {warn}
          </div>
        ) : null}
        <div className="sl-field">
          <label htmlFor="title">Book title</label>
          <input id="title" name="title" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Jannat Ke Pattay" />
        </div>
        <div className="sl-grid sl-g2">
          <div className="sl-field">
            <label htmlFor="author">Writer / author</label>
            <input id="author" name="author" maxLength={120} defaultValue={val("author", init.author)} placeholder="e.g. Nemrah Ahmed" />
          </div>
          <div className="sl-field">
            <label htmlFor="language">Language</label>
            <select id="language" name="language" defaultValue={val("language", init.language || "Urdu")}>
              {["Urdu", "English", "Roman Urdu", "Punjabi", "Other"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="sl-field">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={6} maxLength={5000} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is the story about? Print quality, edition, anything a reader should know." />
          <small>Plain text. No phone numbers, links, emails or social handles — buyers order through the website.</small>
        </div>
        <div className="sl-grid sl-g3">
          <div className="sl-field">
            <label htmlFor="binding">Binding</label>
            <select id="binding" name="binding" defaultValue={val("binding", init.binding || "paperback")}>
              <option value="paperback">Paperback</option>
              <option value="hardcover">Hardcover</option>
              <option value="">Other</option>
            </select>
          </div>
          <div className="sl-field">
            <label htmlFor="condition">Condition</label>
            <select id="condition" name="condition" defaultValue={val("condition", init.condition || "new")}>
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
          </div>
          <div className="sl-field">
            <label htmlFor="pages_count">Pages</label>
            <input id="pages_count" name="pages_count" type="number" inputMode="numeric" min={0} defaultValue={val("pages_count", init.pages_count || "")} />
          </div>
        </div>
        <div className="sl-grid sl-g2">
          <div className="sl-field">
            <label htmlFor="isbn">ISBN (optional)</label>
            <input id="isbn" name="isbn" maxLength={20} defaultValue={val("isbn", init.isbn)} />
          </div>
          <div className="sl-field">
            <label htmlFor="tags">Tags (comma separated)</label>
            <input id="tags" name="tags" maxLength={300} defaultValue={val("tags", (init.tags || []).join(", "))} placeholder="romantic, after marriage" />
          </div>
        </div>
      </div>

      <div className="sl-card">
        <h2>
          <i className="fa-solid fa-tag"></i> Price &amp; stock
        </h2>
        <div className="sl-grid sl-g3">
          <div className="sl-field">
            <label htmlFor="price">Price (Rs)</label>
            <input id="price" name="price" type="number" inputMode="numeric" min={minPrice} max={maxPrice} required defaultValue={val("price", init.price || "")} />
            <small>
              Between Rs. {minPrice} and Rs. {maxPrice.toLocaleString()}.
            </small>
          </div>
          <div className="sl-field">
            <label htmlFor="sale_price">Sale price (optional)</label>
            <input id="sale_price" name="sale_price" type="number" inputMode="numeric" min={0} defaultValue={val("sale_price", init.sale_price || "")} />
            <small>Lower than the price. Leave empty for no sale.</small>
          </div>
          <div className="sl-field">
            <label htmlFor="stock">Copies in stock</label>
            <input id="stock" name="stock" type="number" inputMode="numeric" min={0} required defaultValue={val("stock", init.stock ?? 10)} />
          </div>
        </div>
        <label className="sl-check">
          <input type="checkbox" name="hidden" value="1" defaultChecked={init.status === "inactive"} /> Hide this book from the store for now
        </label>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <SubmitBtn className="sl-btn" pending="Saving… (uploading photos)">
          <i className="fa-solid fa-floppy-disk"></i> {init.id ? "Save changes" : "Publish book"}
        </SubmitBtn>
        <a className="sl-btn ghost" href="/seller/products/">
          Cancel
        </a>
      </div>
    </form>
  );
}
