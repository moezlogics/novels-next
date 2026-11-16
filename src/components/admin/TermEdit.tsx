import Link from "next/link";
import { saveTerm } from "@/app/newlogin/(panel)/taxonomy-actions";
import { Flash, ImageField, RichText, SeoBox, Submit } from "./Fields";
import { siteUrl } from "@/lib/settings";

export default function TermEdit({
  kind,
  term,
  ok,
  err,
}: {
  kind: "categories" | "writers" | "series";
  term: { id: number; name: string; slug: string; description?: string; short_bio?: string; image?: string; meta_title?: string; meta_description?: string };
  ok?: string;
  err?: string;
}) {
  return (
    <>
      <Flash ok={ok} err={err} />
      <form action={saveTerm}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={term.id} />
        <div className="a-main-side">
          <div>
            <div className="a-card">
              <div className="a-grid a-g2">
                <div className="a-field">
                  <label>Name</label>
                  <input type="text" name="name" defaultValue={term.name} required />
                </div>
                <div className="a-field">
                  <label>URL slug</label>
                  <input type="text" name="slug" defaultValue={term.slug} />
                </div>
              </div>
              {kind === "writers" ? (
                <div className="a-field">
                  <label>Short bio (shown on novel pages)</label>
                  <textarea name="short_bio" rows={3} defaultValue={term.short_bio} />
                </div>
              ) : null}
              {kind !== "series" ? (
                <div className="a-field" style={{ marginBottom: 0 }}>
                  <label>{kind === "writers" ? "Full biography (bottom of writer page)" : "Description (bottom of category page)"}</label>
                  <RichText name="description" defaultValue={term.description || ""} minHeight={260} />
                </div>
              ) : null}
            </div>
            {kind !== "series" ? (
              <div className="a-card">
                <h3>
                  <i className="fa-solid fa-magnifying-glass"></i> SEO
                </h3>
                <SeoBox title={term.meta_title} description={term.meta_description} url={`${siteUrl()}/${term.slug}/`} fallbackTitle={term.name} />
                {kind === "writers" ? <p className="a-muted" style={{ fontSize: ".78rem", marginBottom: 0 }}>Tip: use {"{count}"} in the description to show the number of novels.</p> : null}
              </div>
            ) : null}
          </div>
          <div>
            <div className="a-card">
              <div className="a-row">
                <Submit>
                  <i className="fa-solid fa-floppy-disk"></i> Save
                </Submit>
                {kind !== "series" ? (
                  <a href={`/${term.slug}/`} target="_blank" className="a-btn a-btn-g">
                    <i className="fa-solid fa-eye"></i> View
                  </a>
                ) : null}
                <Link href={`/newlogin/${kind}/`} className="a-btn a-btn-g">
                  Back
                </Link>
              </div>
            </div>
            {kind !== "series" ? (
              <div className="a-card">
                <ImageField name="image" current={term.image} label={kind === "writers" ? "Profile picture" : "Category image"} />
              </div>
            ) : null}
          </div>
        </div>
      </form>
    </>
  );
}
