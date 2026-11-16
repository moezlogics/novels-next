"use server";
import { redirect } from "next/navigation";
import { col, nextId } from "@/lib/db";
import { back, bool, bustSite, imageFrom, int, requireAdmin, str } from "@/lib/admin";
import { pdfSize } from "@/lib/pdfCache";
import { extractDriveId, slugify } from "@/lib/utils";
import { slugMoved } from "@/lib/redirects";

async function uniquePostSlug(base: string, exclude?: number) {
  const posts = await col.posts();
  let slug = base || "novel";
  for (let n = 2; n < 300; n++) {
    const hit = await posts.findOne({ slug, ...(exclude ? { _id: { $ne: exclude } } : {}) }, { projection: { _id: 1 } });
    if (!hit) return slug;
    slug = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

/** {title}-novel-by-{writer} — same slug format as the PHP admin. */
function buildSlug(title: string, writer: string) {
  const t = slugify(title) || "novel";
  if (/-novel-by-[a-z0-9-]+$/.test(t)) return t;
  const w = slugify(writer);
  return w ? `${t}-novel-by-${w}` : t;
}

async function ensureWriter(name: string): Promise<number | null> {
  name = name.trim();
  if (!name) return null;
  const writers = await col.writers();
  const slug = slugify(name);
  const hit = await writers.findOne({ $or: [{ slug }, { name }] });
  if (hit) return hit._id;
  const id = await nextId("writers");
  await writers.insertOne({ _id: id, name, slug: slug || `writer-${id}`, bio: "", short_bio: "", profile_pic: "", meta_title: "", meta_description: "" });
  return id;
}

async function ensureSeries(name: string): Promise<number | null> {
  name = name.trim();
  if (!name) return null;
  const series = await col.series();
  const slug = slugify(name) || "series";
  const hit = await series.findOne({ slug });
  if (hit) return hit._id;
  const id = await nextId("series");
  await series.insertOne({ _id: id, name, slug, created_at: new Date() });
  return id;
}

export async function savePost(fd: FormData) {
  await requireAdmin();
  const id = int(fd, "id");
  const title = str(fd, "title", 255);
  if (!title) back(id ? `/newlogin/posts/edit/${id}/` : "/newlogin/posts/new/", "Title is required", "err");

  const writerId = str(fd, "new_writer") ? await ensureWriter(str(fd, "new_writer")) : int(fd, "writer_id");
  const writer = writerId ? await (await col.writers()).findOne({ _id: writerId }) : null;
  const seriesId = str(fd, "new_series") ? await ensureSeries(str(fd, "new_series")) : int(fd, "series_id");
  const season = seriesId ? Math.max(1, int(fd, "season_number") || 1) : null;

  const cats = str(fd, "categories")
    .split(",")
    .map((x) => parseInt(x, 10))
    .filter((x) => x > 0);
  let primary = int(fd, "primary_category");
  if (!primary || !cats.includes(primary)) primary = cats[0] ?? null;
  const additional = cats.filter((c) => c !== primary);

  const posts = await col.posts();
  const existing = id ? await posts.findOne({ _id: id }) : null;
  const wantSlug = slugify(str(fd, "slug"));
  const slug = await uniquePostSlug(wantSlug || (existing?.slug ?? buildSlug(title, writer?.name || "")), id || undefined);

  const readUrl = str(fd, "read_online_url", 512);
  const dlUrl = bool(fd, "same_download") ? readUrl : str(fd, "download_url", 512);
  const posted = str(fd, "posted_date");

  const doc = {
    title,
    slug,
    category_id: primary,
    additional_categories: additional,
    category_ids: primary ? [primary, ...additional] : additional,
    writer_id: writerId,
    series_id: seriesId,
    season_number: season,
    description: str(fd, "description"),
    image: await imageFrom(fd, "image", title),
    read_online_url: readUrl,
    read_parts: str(fd, "read_parts", 5000)
      .split(/\s+/)
      .filter((u) => extractDriveId(u))
      .slice(0, 20),
    download_url: dlUrl,
    file_size: str(fd, "file_size", 100),
    file_type: str(fd, "file_type", 100) || "PDF",
    pages: int(fd, "pages"),
    status: (str(fd, "status") === "draft" ? "draft" : "active") as "draft" | "active",
    is_featured: bool(fd, "is_featured"),
    meta_title: str(fd, "meta_title", 255),
    meta_description: str(fd, "meta_description", 500),
    updated_at: new Date(),
    posted_date: posted ? new Date(posted) : existing?.posted_date || new Date(),
  };

  // Save the PDF size now so the reader opens with zero extra requests
  const drive = extractDriveId(readUrl);
  const pdf_size = drive ? (existing?.read_online_url === readUrl && existing?.pdf_size) || (await pdfSize(drive)) : 0;

  let newId = id;
  if (existing) {
    await posts.updateOne({ _id: existing._id }, { $set: { ...doc, pdf_size } });
    if (existing.slug !== slug) await slugMoved(existing.slug, `/${slug}/`);
  }
  else {
    newId = await nextId("posts");
    await posts.insertOne({ _id: newId, ...doc, pdf_size, views: 0, reads: 0, downloads: 0 });
  }
  bustSite();
  const warn = drive && !pdf_size ? " — but the Drive file is not reachable. Check that it is shared as 'Anyone with the link'." : "";
  back(`/newlogin/posts/edit/${newId}/`, (existing ? "Novel updated ✓" : "Novel published ✓") + warn, warn ? "err" : "ok");
}

export async function deletePost(fd: FormData) {
  await requireAdmin();
  const id = int(fd, "id");
  if (id) {
    // a deleted novel's address goes to its category (or home), never a 404
    const gone = await (await col.posts()).findOne({ _id: id }, { projection: { slug: 1, category_id: 1 } });
    const cat = gone?.category_id ? await (await col.categories()).findOne({ _id: gone.category_id }, { projection: { slug: 1 } }) : null;
    if (gone?.slug) await slugMoved(gone.slug, cat?.slug ? `/${cat.slug}/` : "/");
    await (await col.posts()).deleteOne({ _id: id });
    await (await col.comments()).deleteMany({ post_id: id });
    bustSite();
  }
  back("/newlogin/posts/", "Novel deleted");
}

export async function bulkPosts(fd: FormData) {
  await requireAdmin();
  const ids = fd
    .getAll("ids")
    .map((x) => parseInt(String(x), 10))
    .filter((x) => x > 0);
  const action = str(fd, "bulk");
  if (!ids.length) back("/newlogin/posts/", "Select at least one novel", "err");
  const posts = await col.posts();
  if (action === "delete") {
    await posts.deleteMany({ _id: { $in: ids } });
    await (await col.comments()).deleteMany({ post_id: { $in: ids } });
  } else if (action === "publish" || action === "draft") {
    await posts.updateMany({ _id: { $in: ids } }, { $set: { status: action === "publish" ? "active" : "draft", updated_at: new Date() } });
  } else if (action === "check") {
    const rows = await posts.find({ _id: { $in: ids } }, { projection: { read_online_url: 1 } }).toArray();
    for (const r of rows) {
      const d = extractDriveId(r.read_online_url);
      if (d) await posts.updateOne({ _id: r._id }, { $set: { pdf_size: await pdfSize(d) } });
    }
  }
  bustSite();
  redirect(`/newlogin/posts/?ok=${encodeURIComponent(`${ids.length} novel(s) updated`)}`);
}
