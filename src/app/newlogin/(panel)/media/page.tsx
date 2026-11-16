import Link from "next/link";
import { col } from "@/lib/db";
import { back, int, requireAdmin, str } from "@/lib/admin";
import { deleteStoredFile, saveImage } from "@/lib/storage";
import { ConfirmButton, Flash, Submit } from "@/components/admin/Fields";
import { formatDate, thumbUrl } from "@/lib/utils";

export const metadata = { title: "Media" };

async function upload(fd: FormData) {
  "use server";
  await requireAdmin();
  let n = 0;
  for (const f of fd.getAll("files")) {
    if (f instanceof File && f.size) {
      try {
        await saveImage(f);
        n++;
      } catch (e) {
        back("/newlogin/media/", (e as Error).message, "err");
      }
    }
  }
  back("/newlogin/media/", `${n} image(s) uploaded`);
}

async function update(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = int(fd, "id")!;
  const media = await col.media();
  if (str(fd, "a") === "delete") {
    const m = await media.findOne({ _id: id });
    if (m) {
      await deleteStoredFile(m.path);
      await media.deleteOne({ _id: id });
    }
    back("/newlogin/media/", "Image deleted");
  }
  await media.updateOne({ _id: id }, { $set: { alt_text: str(fd, "alt_text", 300), caption: str(fd, "caption", 300) } });
  back(`/newlogin/media/?open=${id}`, "Saved");
}

export default async function Media({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; q?: string; page?: string; open?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const rx = sp.q ? new RegExp(sp.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
  const q = rx ? { $or: [{ original_name: rx }, { alt_text: rx }] } : {};
  const mc = await col.media();
  const [total, rows] = await Promise.all([mc.countDocuments(q), mc.find(q).sort({ _id: -1 }).skip((page - 1) * 48).limit(48).toArray()]);
  const open = rows.find((r) => r._id === parseInt(sp.open || "", 10));
  return (
    <>
      <Flash ok={sp.ok} err={sp.err} />
      <form action={upload} className="a-card a-row" style={{ padding: 12 }}>
        <input type="file" name="files" accept="image/*" multiple required style={{ flex: 1 }} />
        <Submit pendingText="Uploading…">
          <i className="fa-solid fa-upload"></i> Upload
        </Submit>
        <span className="a-muted" style={{ fontSize: ".78rem" }}>
          Converted to WebP automatically (+200/400px thumbnails)
        </span>
      </form>
      <form className="a-row" style={{ marginBottom: 12 }}>
        <input type="search" name="q" defaultValue={sp.q} placeholder="Search images…" style={{ maxWidth: 320 }} />
        <button className="a-btn a-btn-g a-btn-sm">Search</button>
        <span className="a-sp" />
        <span className="a-muted">{total} files</span>
      </form>
      <div className={open ? "a-main-side" : ""}>
        <div className="a-media-grid">
          {rows.map((m) => (
            <Link key={m._id} href={`?open=${m._id}${sp.page ? `&page=${sp.page}` : ""}`} style={{ position: "relative", border: `2px solid ${open?._id === m._id ? "var(--a-acc)" : "transparent"}`, borderRadius: 10, overflow: "hidden", aspectRatio: "1", background: "#111", display: "block" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbUrl(m.path, 200)} alt={m.alt_text} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </Link>
          ))}
        </div>
        {open ? (
          <form action={update} className="a-card">
            <input type="hidden" name="id" value={open._id} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/${open.path}`} alt="" style={{ width: "100%", borderRadius: 10, marginBottom: 10 }} />
            <p className="a-muted" style={{ fontSize: ".78rem", wordBreak: "break-all" }}>
              /{open.path}
              <br />
              {open.width}×{open.height} · {(open.filesize / 1024).toFixed(0)} KB · {formatDate(open.created_at)}
            </p>
            <div className="a-field">
              <label>Alt text (SEO)</label>
              <input type="text" name="alt_text" defaultValue={open.alt_text} />
            </div>
            <div className="a-field">
              <label>Caption</label>
              <input type="text" name="caption" defaultValue={open.caption} />
            </div>
            <div className="a-row">
              <Submit className="a-btn a-btn-p a-btn-sm">Save</Submit>
              <ConfirmButton name="a" value="delete" message="Delete this image file? Pages using it will show a broken image.">
                <i className="fa-solid fa-trash-can"></i> Delete
              </ConfirmButton>
            </div>
          </form>
        ) : null}
      </div>
      {total > 48 ? (
        <div className="a-pager">
          {Array.from({ length: Math.ceil(total / 48) }).map((_, i) => (
            <Link key={i} href={`?page=${i + 1}`} className={i + 1 === page ? "on" : ""}>
              {i + 1}
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
