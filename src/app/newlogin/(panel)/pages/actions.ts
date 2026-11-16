"use server";
import { col, nextId } from "@/lib/db";
import { back, bustSite, int, requireAdmin, str } from "@/lib/admin";
import { slugify } from "@/lib/utils";
import { slugMoved } from "@/lib/redirects";

export async function savePage(fd: FormData) {
  await requireAdmin();
  const id = int(fd, "id");
  const title = str(fd, "title", 255);
  const edit = id ? `/newlogin/pages/edit/${id}/` : "/newlogin/pages/new/";
  if (!title) back(edit, "Title is required", "err");
  const slug = slugify(str(fd, "slug") || title);
  const pages = await col.pages();
  const clash =
    (await pages.findOne({ slug, ...(id ? { _id: { $ne: id } } : {}) })) ||
    (await (await col.posts()).findOne({ slug })) ||
    (await (await col.categories()).findOne({ slug })) ||
    (await (await col.writers()).findOne({ slug }));
  if (clash) back(edit, "That URL slug is already in use", "err");
  const status = (["publish", "draft", "trash"].includes(str(fd, "status")) ? str(fd, "status") : "publish") as "publish" | "draft" | "trash";
  const doc = { title, slug, content: str(fd, "content"), meta_title: str(fd, "meta_title", 255), meta_description: str(fd, "meta_description", 500), status, updated_at: new Date() };
  let newId = id;
  if (id) {
    const before = await pages.findOne({ _id: id }, { projection: { slug: 1 } });
    await pages.updateOne({ _id: id }, { $set: doc });
    if (before && before.slug !== slug) await slugMoved(before.slug, `/${slug}/`);
  }
  else {
    newId = await nextId("pages");
    await pages.insertOne({ _id: newId, ...doc, created_at: new Date() });
  }
  bustSite();
  back(`/newlogin/pages/edit/${newId}/`, "Page saved ✓");
}

export async function deletePage(fd: FormData) {
  await requireAdmin();
  await (await col.pages()).deleteOne({ _id: int(fd, "id")! });
  bustSite();
  back("/newlogin/pages/", "Page deleted");
}
