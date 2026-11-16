import Link from "next/link";
import type { Post } from "@/lib/types";
import { CategoryPicker, ConfirmButton, ImageField, RichText, SeoBox, SlugInput, Submit } from "./Fields";
import DriveTools from "./DriveTools";
import { savePost, deletePost } from "@/app/newlogin/(panel)/posts/actions";
import { siteUrl } from "@/lib/settings";

function dt(d?: Date) {
  if (!d) return "";
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
}

export default function PostForm({ post, cats, writers, series }: { post?: Post | null; cats: { id: number; name: string }[]; writers: { id: number; name: string }[]; series: { id: number; name: string }[] }) {
  const p = post;
  return (
    <>
      <form action={savePost}>
        {p ? <input type="hidden" name="id" value={p._id} /> : null}
        <div className="a-main-side">
          <div>
            <div className="a-card">
              <div className="a-field">
                <label>Novel Title *</label>
                <input type="text" name="title" defaultValue={p?.title} required placeholder="e.g. Jannat Ke Pattay" style={{ fontSize: "1.05rem", fontWeight: 700 }} />
              </div>
              <SlugInput defaultValue={p?.slug} prefix={`${siteUrl().replace(/^https?:\/\//, "")}/`} />
              <div className="a-field" style={{ marginBottom: 0 }}>
                <label>Description</label>
                <RichText name="description" defaultValue={p?.description || ""} />
              </div>
            </div>

            <div className="a-card">
              <h3>
                <i className="fa-solid fa-file-pdf"></i> Read &amp; Download (Google Drive)
              </h3>
              <div className="a-field">
                <label>Read Online URL</label>
                <input type="url" name="read_online_url" defaultValue={p?.read_online_url} placeholder="https://drive.google.com/file/d/…/view" />
                <small>Paste the Google Drive share link (Anyone with the link → Viewer). This is Part 1 if the novel is split.</small>
              </div>
              <div className="a-field">
                <label>More parts (big novels)</label>
                <textarea name="read_parts" rows={3} defaultValue={(p?.read_parts || []).join("\n")} placeholder={"https://drive.google.com/file/d/…  (Part 2)\nhttps://drive.google.com/file/d/…  (Part 3)"} style={{ fontSize: ".82rem" }} />
                <small>
                  Google&apos;s viewer often fails on very big PDFs (over ~25 MB or ~2,500 pages): page 1 shows, then &quot;Could not preview the file&quot;. Split such novels into PDFs of about 800 pages, put Part 1 above and the other parts here, one link per line. Readers get Part 1 / Part 2 buttons.
                </small>
              </div>
              <label className="a-check" style={{ marginBottom: 12 }}>
                <input type="checkbox" name="same_download" value="1" defaultChecked={!p || p.download_url === p.read_online_url} /> Download link is the same file
              </label>
              <div className="a-field">
                <label>Download URL (if different)</label>
                <input type="url" name="download_url" defaultValue={p?.download_url !== p?.read_online_url ? p?.download_url : ""} placeholder="https://drive.google.com/…" />
              </div>
              <div className="a-grid a-g3">
                <div className="a-field">
                  <label>File Size</label>
                  <input type="text" name="file_size" defaultValue={p?.file_size} placeholder="e.g. 14 MB" />
                </div>
                <div className="a-field">
                  <label>File Format</label>
                  <input type="text" name="file_type" defaultValue={p?.file_type || "PDF"} />
                </div>
                <div className="a-field">
                  <label>Pages</label>
                  <input type="number" name="pages" defaultValue={p?.pages ?? ""} min={1} />
                </div>
              </div>
              <DriveTools />
            </div>

            <div className="a-card">
              <h3>
                <i className="fa-solid fa-magnifying-glass"></i> SEO
              </h3>
              <SeoBox title={p?.meta_title} description={p?.meta_description} url={`${siteUrl()}/${p?.slug || "novel-slug"}/`} fallbackTitle={p?.title} />
            </div>
          </div>

          <div>
            <div className="a-card">
              <h3>
                <i className="fa-solid fa-paper-plane"></i> Publish
              </h3>
              <div className="a-field">
                <label>Status</label>
                <select name="status" defaultValue={p?.status || "active"}>
                  <option value="active">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div className="a-field">
                <label>Publish date</label>
                <input type="datetime-local" name="posted_date" defaultValue={dt(p?.posted_date)} />
              </div>
              <label className="a-check" style={{ marginBottom: 14 }}>
                <input type="checkbox" name="is_featured" value="1" defaultChecked={p?.is_featured} /> Featured novel
              </label>
              <div className="a-row">
                <Submit>
                  <i className="fa-solid fa-floppy-disk"></i> {p ? "Update" : "Publish"}
                </Submit>
                {p ? (
                  <a href={`/${p.slug}/`} target="_blank" className="a-btn a-btn-g">
                    <i className="fa-solid fa-eye"></i> View
                  </a>
                ) : null}
              </div>
              {p ? (
                <p className="a-muted" style={{ fontSize: ".78rem", marginBottom: 0 }}>
                  {p.views || 0} views · {p.reads || 0} reads · {p.downloads || 0} downloads
                </p>
              ) : null}
            </div>

            <div className="a-card">
              <ImageField name="image" current={p?.image} label="Cover Image" help="Auto-converted to WebP with 200/400px thumbnails." />
            </div>

            <div className="a-card">
              <div className="a-field">
                <label>Writer</label>
                <select name="writer_id" defaultValue={p?.writer_id ?? ""}>
                  <option value="">— Select writer —</option>
                  {writers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="a-field">
                <label>…or add a new writer</label>
                <input type="text" name="new_writer" placeholder="New writer name" />
              </div>
            </div>

            <div className="a-card">
              <CategoryPicker cats={cats} selected={p?.category_ids || []} primary={p?.category_id ?? null} />
            </div>

            <div className="a-card">
              <h3>
                <i className="fa-solid fa-layer-group"></i> Series / Seasons
              </h3>
              <div className="a-field">
                <label>Series</label>
                <select name="series_id" defaultValue={p?.series_id ?? ""}>
                  <option value="">— Not part of a series —</option>
                  {series.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="a-field">
                <label>…or new series name</label>
                <input type="text" name="new_series" placeholder="e.g. Tum Jo Aye Zindagi Main" />
              </div>
              <div className="a-field" style={{ marginBottom: 0 }}>
                <label>Season number</label>
                <input type="number" name="season_number" min={1} defaultValue={p?.season_number ?? ""} placeholder="1" />
              </div>
            </div>
          </div>
        </div>
      </form>
      {p ? (
        <form action={deletePost} className="a-card a-row" style={{ borderColor: "rgba(239,68,68,.35)" }}>
          <input type="hidden" name="id" value={p._id} />
          <div style={{ flex: 1 }}>
            <b>Delete this novel</b>
            <div className="a-muted" style={{ fontSize: ".82rem" }}>
              Removes the novel and its comments permanently.
            </div>
          </div>
          <ConfirmButton message="Delete this novel permanently? This cannot be undone.">
            <i className="fa-solid fa-trash-can"></i> Delete
          </ConfirmButton>
          <Link href="/newlogin/posts/" className="a-btn a-btn-g a-btn-sm">
            Back to list
          </Link>
        </form>
      ) : null}
    </>
  );
}
