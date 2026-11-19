import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { readSettingsUncached } from "@/lib/settings";
import { Flash, ImageField, RichText, Submit } from "@/components/admin/Fields";
import { savePageContent } from "../settings-actions";
import type { Settings } from "@/lib/types";

export const metadata = { title: "Page Content" };

const TABS = [
  { k: "home", label: "Homepage", url: "/" },
  { k: "about", label: "About Us", url: "/about/" },
  { k: "contact", label: "Contact", url: "/contact/" },
];

export default async function PageContent({ searchParams }: { searchParams: Promise<{ ok?: string; tab?: string }> }) {
  await requireAdmin(true);
  const [s, sp] = await Promise.all([readSettingsUncached(), searchParams]);
  const tab = TABS.find((t) => t.k === sp.tab)?.k || "home";
  const v = (k: keyof Settings) => String(s[k] ?? "");
  const pre = tab === "home" ? "homepage" : tab;
  return (
    <>
      <Flash ok={sp.ok} />
      <div className="a-tabs">
        {TABS.map((t) => (
          <Link key={t.k} href={`?tab=${t.k}`} className={t.k === tab ? "on" : ""}>
            {t.label}
          </Link>
        ))}
      </div>
      <form action={savePageContent} className="a-card" key={tab}>
        <input type="hidden" name="tab" value={tab} />
        {tab === "home" ? (
          <>
            <ImageField
              name="homepage_featured_image"
              current={v("homepage_featured_image")}
              label="Homepage featured image (default share image)"
              help="Shown when the homepage is shared on WhatsApp / Facebook (best 1200×630). Novel, writer and category pages use their own picture; any page without one uses this image."
              wide
            />
            <div className="a-field">
              <label>Bottom section title</label>
              <input type="text" name="homepage_content_title" defaultValue={v("homepage_content_title")} />
            </div>
            <div className="a-field">
              <label>Bottom section content (SEO text under the novels)</label>
              <RichText name="homepage_content" defaultValue={v("homepage_content")} />
            </div>
          </>
        ) : (
          <>
            <div className="a-grid a-g2">
              <div className="a-field">
                <label>Page heading</label>
                <input type="text" name={`${pre}_page_title`} defaultValue={v(`${pre}_page_title` as keyof Settings)} />
              </div>
              <div className="a-field">
                <label>Subtitle</label>
                <input type="text" name={`${pre}_page_subtitle`} defaultValue={v(`${pre}_page_subtitle` as keyof Settings)} />
              </div>
              <div className="a-field">
                <label>Meta title</label>
                <input type="text" name={`${pre}_meta_title`} defaultValue={v(`${pre}_meta_title` as keyof Settings)} />
              </div>
              <div className="a-field">
                <label>Meta description</label>
                <input type="text" name={`${pre}_meta_description`} defaultValue={v(`${pre}_meta_description` as keyof Settings)} />
              </div>
            </div>
            <div className="a-field">
              <label>Content</label>
              <RichText name={`${pre}_page_content`} defaultValue={v(`${pre}_page_content` as keyof Settings)} />
            </div>
          </>
        )}
        <div className="a-row">
          <Submit>
            <i className="fa-solid fa-floppy-disk"></i> Save
          </Submit>
          <a href={TABS.find((t) => t.k === tab)!.url} target="_blank" className="a-btn a-btn-g">
            <i className="fa-solid fa-eye"></i> View page
          </a>
        </div>
      </form>
    </>
  );
}
