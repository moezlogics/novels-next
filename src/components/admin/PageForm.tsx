import Link from "next/link";
import type { Page } from "@/lib/types";
import { RichText, SeoBox, SlugInput, Submit } from "./Fields";
import { savePage } from "@/app/newlogin/(panel)/pages/actions";
import { siteUrl } from "@/lib/settings";

export default function PageForm({ page }: { page?: Page | null }) {
  return (
    <form action={savePage}>
      {page ? <input type="hidden" name="id" value={page._id} /> : null}
      <div className="a-main-side">
        <div>
          <div className="a-card">
            <div className="a-field">
              <label>Title</label>
              <input type="text" name="title" defaultValue={page?.title} required style={{ fontSize: "1.05rem", fontWeight: 700 }} />
            </div>
            <SlugInput defaultValue={page?.slug} prefix={`${siteUrl().replace(/^https?:\/\//, "")}/`} />
            <div className="a-field" style={{ marginBottom: 0 }}>
              <label>Content</label>
              <RichText name="content" defaultValue={page?.content || ""} minHeight={420} />
            </div>
          </div>
          <div className="a-card">
            <h3>
              <i className="fa-solid fa-magnifying-glass"></i> SEO
            </h3>
            <SeoBox title={page?.meta_title} description={page?.meta_description} url={`${siteUrl()}/${page?.slug || "page-slug"}/`} fallbackTitle={page?.title} />
          </div>
        </div>
        <div>
          <div className="a-card">
            <div className="a-field">
              <label>Status</label>
              <select name="status" defaultValue={page?.status || "publish"}>
                <option value="publish">Published</option>
                <option value="draft">Draft</option>
                <option value="trash">Trash</option>
              </select>
            </div>
            <div className="a-row">
              <Submit>
                <i className="fa-solid fa-floppy-disk"></i> Save
              </Submit>
              {page ? (
                <a href={`/${page.slug}/`} target="_blank" className="a-btn a-btn-g">
                  <i className="fa-solid fa-eye"></i> View
                </a>
              ) : null}
              <Link href="/newlogin/pages/" className="a-btn a-btn-g">
                Back
              </Link>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
