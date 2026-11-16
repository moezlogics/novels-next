import { col } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { readSettingsUncached } from "@/lib/settings";
import { Flash } from "@/components/admin/Fields";
import FamousPicker from "@/components/admin/FamousPicker";
import { saveFamous } from "../settings-actions";
import { thumbUrl } from "@/lib/utils";

export const metadata = { title: "Famous Novels" };

export default async function Famous({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requireAdmin(true);
  const [s, sp, posts] = await Promise.all([readSettingsUncached(), searchParams, (await col.posts()).find({ status: "active" }, { projection: { title: 1, image: 1 } }).sort({ _id: -1 }).toArray()]);
  return (
    <>
      <Flash ok={sp.ok} />
      <form action={saveFamous} className="a-card">
        <div className="a-field" style={{ maxWidth: 420 }}>
          <label>Section title on homepage</label>
          <input type="text" name="famous_title" defaultValue={s.homepage_famous_title || "Famous Novels"} />
        </div>
        <FamousPicker all={posts.map((p) => ({ id: p._id, title: p.title, img: thumbUrl(p.image, 200) }))} selected={s.homepage_famous_ids || []} />
      </form>
    </>
  );
}
