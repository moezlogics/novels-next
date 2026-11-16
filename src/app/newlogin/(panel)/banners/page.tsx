import { requireAdmin } from "@/lib/admin";
import { readSettingsUncached } from "@/lib/settings";
import { Flash, Submit } from "@/components/admin/Fields";
import { saveBanners } from "../settings-actions";
import { mediaUrl } from "@/lib/utils";

export const metadata = { title: "Banners" };

export default async function Banners({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requireAdmin(true);
  const [s, sp] = await Promise.all([readSettingsUncached(), searchParams]);
  const sets = [
    { key: "banner_mobile" as const, label: "Mobile banners (shown below 768px)", list: s.banner_mobile || [] },
    { key: "banner_desktop" as const, label: "Desktop banners (768px and wider)", list: s.banner_desktop || [] },
  ];
  return (
    <>
      <Flash ok={sp.ok} />
      <p className="a-muted">Banners show on the homepage (after Recent Uploads) and at the top of the shop. They auto-slide every 4.5 seconds.</p>
      <form action={saveBanners}>
        <div className="a-grid a-g2">
          {sets.map((set) => (
            <div className="a-card" key={set.key}>
              <h3>
                <i className="fa-solid fa-images"></i> {set.label}
              </h3>
              {set.list.map((b, i) => (
                <div key={i} className="a-row" style={{ flexWrap: "nowrap", marginBottom: 10, alignItems: "flex-start" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(b.img)} alt="" style={{ width: 140, borderRadius: 8 }} />
                  <div style={{ flex: 1 }}>
                    <input type="hidden" name={`${set.key}_img`} value={b.img} />
                    <input type="hidden" name={`${set.key}_w`} value={b.w || 0} />
                    <input type="hidden" name={`${set.key}_h`} value={b.h || 0} />
                    <input type="text" name={`${set.key}_link`} defaultValue={b.link} placeholder="Link (optional)" />
                    <label className="a-check" style={{ marginTop: 6 }}>
                      <input type="checkbox" name={`${set.key}_remove`} value={i} /> Remove
                    </label>
                  </div>
                </div>
              ))}
              <div className="a-field" style={{ marginTop: 10 }}>
                <label>Add new banner image(s)</label>
                <input type="file" name={`${set.key}_new`} accept="image/*" multiple />
              </div>
              <div className="a-field">
                <label>Link for new banner(s)</label>
                <input type="text" name={`${set.key}_newlink`} placeholder="https://… or /shop/" />
              </div>
            </div>
          ))}
        </div>
        <Submit>
          <i className="fa-solid fa-floppy-disk"></i> Save banners
        </Submit>
      </form>
    </>
  );
}
