"use server";
import { col, nextId } from "@/lib/db";
import { back, bustSite, imageFrom, int, requireAdmin, str } from "@/lib/admin";
import { slugify } from "@/lib/utils";
import { slugMoved } from "@/lib/redirects";

type Kind = "categories" | "writers" | "series";
const PATH: Record<Kind, string> = { categories: "/newlogin/categories/", writers: "/newlogin/writers/", series: "/newlogin/series/" };

async function slugTaken(slug: string, exclude?: number) {
  // categories, writers, posts and pages share the same /slug/ URL space
  const [c, w, p, pg] = await Promise.all([
    (await col.categories()).findOne({ slug, ...(exclude ? { _id: { $ne: exclude } } : {}) }, { projection: { _id: 1 } }),
    (await col.writers()).findOne({ slug, ...(exclude ? { _id: { $ne: exclude } } : {}) }, { projection: { _id: 1 } }),
    (await col.posts()).findOne({ slug }, { projection: { _id: 1 } }),
    (await col.pages()).findOne({ slug }, { projection: { _id: 1 } }),
  ]);
  return !!(c || w || p || pg);
}

export async function addTerm(fd: FormData) {
  await requireAdmin();
  const kind = str(fd, "kind") as Kind;
  const name = str(fd, "name", 120);
  if (!name) back(PATH[kind], "Name is required", "err");
  let slug = slugify(str(fd, "slug") || name);
  if (kind === "series") {
    const s = await col.series();
    if (await s.findOne({ slug })) back(PATH[kind], "This series already exists", "err");
    await s.insertOne({ _id: await nextId("series"), name, slug, created_at: new Date() });
  } else {
    if (await slugTaken(slug)) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    const id = await nextId(kind);
    if (kind === "categories") await (await col.categories()).insertOne({ _id: id, name, slug, description: "", image: "", meta_title: "", meta_description: "" });
    else await (await col.writers()).insertOne({ _id: id, name, slug, bio: "", short_bio: "", profile_pic: "", meta_title: "", meta_description: "" });
  }
  bustSite();
  back(PATH[kind], `"${name}" added`);
}

export async function saveTerm(fd: FormData) {
  await requireAdmin();
  const kind = str(fd, "kind") as Kind;
  const id = int(fd, "id")!;
  const name = str(fd, "name", 120);
  const slug = slugify(str(fd, "slug") || name);
  const edit = `${PATH[kind]}edit/${id}/`;
  if (!name || !slug) back(edit, "Name is required", "err");
  if (kind !== "series" && (await slugTaken(slug, id))) back(edit, "That URL slug is already used by another category, writer, novel or page", "err");
  // remember the old address so it can redirect to the new one
  const before = kind === "categories" ? await (await col.categories()).findOne({ _id: id }, { projection: { slug: 1 } }) : kind === "writers" ? await (await col.writers()).findOne({ _id: id }, { projection: { slug: 1 } }) : null;
  if (kind === "categories") {
    await (await col.categories()).updateOne(
      { _id: id },
      { $set: { name, slug, description: str(fd, "description"), image: await imageFrom(fd, "image", name), meta_title: str(fd, "meta_title", 255), meta_description: str(fd, "meta_description", 500) } },
    );
  } else if (kind === "writers") {
    await (await col.writers()).updateOne(
      { _id: id },
      { $set: { name, slug, bio: str(fd, "description"), short_bio: str(fd, "short_bio", 600), profile_pic: await imageFrom(fd, "image", name), meta_title: str(fd, "meta_title", 255), meta_description: str(fd, "meta_description", 500) } },
    );
  } else {
    await (await col.series()).updateOne({ _id: id }, { $set: { name, slug } });
  }
  if (before && before.slug !== slug) await slugMoved(before.slug, `/${slug}/`);
  bustSite();
  back(edit, before && before.slug !== slug ? "Saved ✓ — the old link now redirects to the new one" : "Saved ✓");
}

export async function deleteTerm(fd: FormData) {
  await requireAdmin();
  const kind = str(fd, "kind") as Kind;
  const id = int(fd, "id")!;
  const posts = await col.posts();
  if (kind === "categories") {
    await (await col.categories()).deleteOne({ _id: id });
    // detach from novels (like ON DELETE SET NULL)
    await posts.updateMany({ category_id: id }, { $set: { category_id: null } });
    await posts.updateMany({ category_ids: id }, { $pull: { category_ids: id, additional_categories: id } });
    const orphan = await posts.find({ category_id: null, "category_ids.0": { $exists: true } }).toArray();
    for (const p of orphan) await posts.updateOne({ _id: p._id }, { $set: { category_id: p.category_ids[0], additional_categories: p.category_ids.slice(1) } });
  } else if (kind === "writers") {
    await (await col.writers()).deleteOne({ _id: id });
    await posts.updateMany({ writer_id: id }, { $set: { writer_id: null } });
  } else {
    await (await col.series()).deleteOne({ _id: id });
    await posts.updateMany({ series_id: id }, { $set: { series_id: null, season_number: null } });
  }
  bustSite();
  back(PATH[kind], "Deleted");
}
