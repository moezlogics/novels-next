import Link from "next/link";
import { col } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { fillTitle, readSettingsUncached } from "@/lib/settings";
import { stripTags } from "@/lib/utils";

export const metadata = { title: "SEO Health" };

type Issue = { level: "bad" | "warn"; what: string; fix: string; href: string };

const len = (s: string | null | undefined) => stripTags(String(s || "")).replace(/\s+/g, " ").trim().length;

/** One screen with every SEO problem on the site, each with a button to fix it. */
export default async function SeoHealth({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireAdmin(true);
  const { type = "" } = await searchParams;
  const s = await readSettingsUncached();
  const [posts, cats, writers, pages] = await Promise.all([
    (await col.posts()).find({}, { projection: { title: 1, slug: 1, status: 1, meta_title: 1, meta_description: 1, description: 1, image: 1, category_id: 1, writer_id: 1, read_online_url: 1, pdf_size: 1 } }).toArray(),
    (await col.categories()).find({}, { projection: { name: 1, slug: 1, description: 1, meta_title: 1, meta_description: 1, image: 1 } }).toArray(),
    (await col.writers()).find({}, { projection: { name: 1, slug: 1, bio: 1, meta_description: 1, profile_pic: 1 } }).toArray(),
    (await col.pages()).find({ status: "publish" }, { projection: { title: 1, slug: 1, content: 1, meta_description: 1 } }).toArray(),
  ]);

  const site: Issue[] = [];
  const S = "/newlogin/settings/?tab=";
  if (!s.homepage_title) site.push({ level: "bad", what: "Homepage has no SEO title", fix: "Add a title of 50–60 characters", href: `${S}seo` });
  if (len(s.homepage_description) < 70) site.push({ level: "bad", what: "Homepage description is missing or too short", fix: "Write 120–160 characters about the site", href: `${S}seo` });
  if (!s.homepage_featured_image && !s.site_logo) site.push({ level: "warn", what: "No share image", fix: "WhatsApp/Facebook previews show no picture — upload a 1200×630 image", href: `${S}seo` });
  if (!s.google_verification && !/google-site-verification/.test(s.search_console || "")) site.push({ level: "warn", what: "Google Search Console is not verified here", fix: "Paste the verification code", href: `${S}seo` });
  if (!s.facebook_url && !s.instagram_url && !s.youtube_url && !s.tiktok_url) site.push({ level: "warn", what: "No social profiles", fix: "Add them so Google links the site to your profiles", href: `${S}contact` });

  const novel: Issue[] = [];
  const titleCount = new Map<string, number>();
  for (const p of posts) titleCount.set(p.title.trim().toLowerCase(), (titleCount.get(p.title.trim().toLowerCase()) || 0) + 1);
  for (const p of posts) {
    if (p.status !== "active") continue;
    const href = `/newlogin/posts/edit/${p._id}/`;
    const shown = p.meta_title || fillTitle(s, s.seo_tpl_novel, { title: p.title });
    const desc = p.meta_description || "";
    const name = `“${p.title}”`;
    if (shown.length > 65) novel.push({ level: "warn", what: `${name}: title is ${shown.length} characters`, fix: "Google cuts titles after ~60 characters — add a shorter SEO title", href });
    if (!desc) novel.push({ level: "warn", what: `${name}: no SEO description`, fix: "Write 120–160 characters (otherwise the start of the description is used)", href });
    else if (desc.length > 160) novel.push({ level: "warn", what: `${name}: SEO description is ${desc.length} characters`, fix: "Keep it under 160 so Google does not cut it", href });
    else if (desc.length < 70) novel.push({ level: "warn", what: `${name}: SEO description is only ${desc.length} characters`, fix: "Make it 120–160 characters", href });
    if (len(p.description) < 300) novel.push({ level: "bad", what: `${name}: very little text on the page (${len(p.description)} characters)`, fix: "Add a story summary, characters and details — thin pages rank poorly", href });
    if (!p.image) novel.push({ level: "bad", what: `${name}: no cover image`, fix: "Upload a cover", href });
    if (!p.category_id) novel.push({ level: "bad", what: `${name}: no category`, fix: "Choose at least one category", href });
    if (!p.writer_id) novel.push({ level: "warn", what: `${name}: no writer`, fix: "Choose the writer (links the novel to the writer's page)", href });
    if ((titleCount.get(p.title.trim().toLowerCase()) || 0) > 1) novel.push({ level: "bad", what: `${name}: another novel has the same title`, fix: "Duplicate titles compete with each other — make each one unique", href });
    if (p.read_online_url && p.pdf_size === 0) novel.push({ level: "bad", what: `${name}: Google Drive file is not reachable`, fix: "Share the file as “Anyone with the link”", href });
  }

  const term: Issue[] = [];
  for (const c of cats) {
    const href = `/newlogin/categories/edit/${c._id}/`;
    if (len(c.description) < 200) term.push({ level: "warn", what: `Category “${c.name}”: little or no text`, fix: "Write a short introduction (200+ characters) — category pages rank better with text", href });
    if (!c.meta_description) term.push({ level: "warn", what: `Category “${c.name}”: no SEO description`, fix: "Write 120–160 characters", href });
  }
  for (const w of writers) {
    const href = `/newlogin/writers/edit/${w._id}/`;
    if (len(w.bio) < 150) term.push({ level: "warn", what: `Writer “${w.name}”: little or no bio`, fix: "Add a short bio (150+ characters)", href });
    if (!w.profile_pic) term.push({ level: "warn", what: `Writer “${w.name}”: no photo`, fix: "Upload a photo or logo", href });
  }
  for (const p of pages) {
    if (len(p.content) < 300) term.push({ level: "warn", what: `Page “${p.title}”: very short`, fix: "Add more text", href: `/newlogin/pages/edit/${p._id}/` });
  }

  const groups: { id: string; label: string; icon: string; items: Issue[] }[] = [
    { id: "site", label: "Site settings", icon: "fa-globe", items: site },
    { id: "novels", label: "Novels", icon: "fa-book", items: novel },
    { id: "terms", label: "Categories, writers & pages", icon: "fa-folder", items: term },
  ];
  const all = groups.flatMap((g) => g.items);
  const bad = all.filter((i) => i.level === "bad").length;
  const checks = posts.length * 9 + cats.length * 2 + writers.length * 2 + pages.length + 5;
  const score = Math.max(0, Math.round(100 - ((bad * 3 + (all.length - bad)) / Math.max(1, checks)) * 100));
  const shown = groups.filter((g) => !type || g.id === type);

  return (
    <>
      <div className="a-grid a-g4" style={{ marginBottom: 14 }}>
        <div className="a-stat">
          <i className="fa-solid fa-gauge-high"></i>
          <div>
            <b style={{ color: score >= 85 ? "#4ade80" : score >= 65 ? "#fbbf24" : "#f87171" }}>{score}/100</b>
            <span>SEO score</span>
          </div>
        </div>
        <div className="a-stat">
          <i className="fa-solid fa-circle-exclamation"></i>
          <div>
            <b>{bad}</b>
            <span>Important problems</span>
          </div>
        </div>
        <div className="a-stat">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <div>
            <b>{all.length - bad}</b>
            <span>Suggestions</span>
          </div>
        </div>
        <div className="a-stat">
          <i className="fa-solid fa-circle-check"></i>
          <div>
            <b>Automatic</b>
            <span>Sitemap, canonicals, schema, redirects</span>
          </div>
        </div>
      </div>
      <div className="a-alert" style={{ marginBottom: 12 }}>
        <i className="fa-solid fa-wand-magic-sparkles"></i> Handled for you: sitemap.xml, robots.txt, canonical links, Google structured data (Book, Breadcrumb, Organization), share previews, trailing slashes, and a 301 redirect whenever you change a link or delete a novel.
      </div>
      <div className="a-tabs" style={{ flexWrap: "wrap" }}>
        <Link href="?" className={!type ? "on" : ""}>
          All ({all.length})
        </Link>
        {groups.map((g) => (
          <Link key={g.id} href={`?type=${g.id}`} className={type === g.id ? "on" : ""}>
            {g.label} ({g.items.length})
          </Link>
        ))}
      </div>
      {shown.map((g) => (
        <div className="a-card" key={g.id}>
          <h3>
            <i className={`fa-solid ${g.icon}`}></i> {g.label}
          </h3>
          {g.items.length ? (
            <div className="a-table-wrap" style={{ margin: 0 }}>
              <table className="a-table">
                <tbody>
                  {[...g.items]
                    .sort((a, b) => (a.level === b.level ? 0 : a.level === "bad" ? -1 : 1))
                    .slice(0, 300)
                    .map((i, k) => (
                      <tr key={k}>
                        <td style={{ width: 90 }}>
                          <span className={`a-pill ${i.level === "bad" ? "bad" : "warn"}`}>{i.level === "bad" ? "Important" : "Improve"}</span>
                        </td>
                        <td>
                          <b>{i.what}</b>
                          <div className="a-muted" style={{ fontSize: ".8rem" }}>
                            {i.fix}
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link href={i.href} className="a-btn a-btn-g a-btn-xs">
                            <i className="fa-solid fa-pen"></i> Fix
                          </Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="a-muted" style={{ margin: 0 }}>
              <i className="fa-solid fa-circle-check" style={{ color: "#4ade80" }}></i> All good.
            </p>
          )}
        </div>
      ))}
    </>
  );
}
