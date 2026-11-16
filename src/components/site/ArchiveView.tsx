import { getArchive, getCategory, getWriter } from "@/lib/data";
import { breadcrumb } from "@/lib/seo";
import { getSettings, siteUrl } from "@/lib/settings";
import { stripTags } from "@/lib/utils";
import JsonLd from "../JsonLd";
import BookCard from "./BookCard";
import LoadMore from "./LoadMore";

export default async function ArchiveView({ kind, id, search, page = 1 }: { kind: "category" | "writer" | "search"; id?: number; search?: string; page?: number }) {
  const base = siteUrl();
  const s = await getSettings();
  let heading = "Search Results";
  let bottom = "";
  let slug = "";
  let schema: unknown[] = [];
  const filter: { categoryId?: number; writerId?: number; search?: string } = {};

  if (kind === "category" && id) {
    const c = (await getCategory(id))!;
    heading = c.name;
    bottom = c.description;
    slug = c.slug;
    filter.categoryId = id;
    const url = `${base}/${c.slug}/`;
    schema = [
      { "@context": "https://schema.org", "@type": "CollectionPage", "@id": `${url}#collectionpage`, url, name: `${c.name} Novels - ${s.site_name}`, description: stripTags(c.description) || `Explore novels in ${c.name}`, isPartOf: { "@id": `${base}/#website` }, inLanguage: "en" },
      breadcrumb(base, [{ name: c.name, path: `/${c.slug}/` }]),
    ];
  } else if (kind === "writer" && id) {
    const w = (await getWriter(id))!;
    heading = w.name;
    bottom = w.bio;
    slug = w.slug;
    filter.writerId = id;
    const url = `${base}/${w.slug}/`;
    const desc = stripTags(w.bio).slice(0, 250);
    schema = [
      {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "@id": `${url}#profilepage`,
        url,
        name: `${w.name} - Novels`,
        description: desc,
        mainEntity: { "@type": "Person", "@id": `${url}/#author`, name: w.name, description: desc, url, worksFor: { "@id": `${base}/#organization` } },
        isPartOf: { "@id": `${base}/#website` },
        inLanguage: "en",
      },
      breadcrumb(base, [{ name: w.name, path: `/${w.slug}/` }]),
    ];
  } else {
    filter.search = search || "";
  }

  const { items, totalPages, total } = await getArchive(filter, page, 12);
  const query = new URLSearchParams();
  if (filter.categoryId) query.set("category", String(filter.categoryId));
  if (filter.writerId) query.set("writer", String(filter.writerId));
  if (filter.search) query.set("search", filter.search);

  return (
    <>
      {schema.map((d, i) => (
        <JsonLd key={i} data={d} />
      ))}
      <div className="py-8 bg-slate-50/50 border-b border-slate-100/80">
        <div className="global-container">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900" style={{ margin: 0 }}>
            {heading}
          </h1>
          {page > 1 ? (
            <p className="text-sm text-slate-500" style={{ margin: "4px 0 0" }}>
              Page {page} of {totalPages}
            </p>
          ) : null}
          {kind === "search" ? (
            <p className="text-sm text-slate-500 mt-1" style={{ margin: "4px 0 0" }}>
              Showing results for: <span className="font-semibold text-slate-800">&quot;{search}&quot;</span> ({total})
            </p>
          ) : null}
        </div>
      </div>

      <div className="global-container py-10">
        <div id="posts-container" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 md:gap-card-gap">
          {items.length ? (
            items.map((p, i) => <BookCard key={p.id} post={p} coverClass="mb-4" small={false} eager={i < 2} />)
          ) : (
            <div className="col-span-full rounded-md border border-amber-100 bg-amber-50 px-4 py-6 text-center text-amber-700">No novels found matching your criteria.</div>
          )}
          {totalPages > page ? <LoadMore query={query.toString()} totalPages={totalPages} start={page} /> : null}
        </div>
        {slug && totalPages > 1 ? <PageLinks base={`/${slug}/`} page={page} pages={totalPages} /> : null}
      </div>

      {bottom ? (
        <div className="border-t border-slate-100 bg-slate-50/50 py-12 mb-6" data-slug={slug}>
          <div className="global-container">
            <div className="prose prose-slate max-w-none text-slate-600 text-sm md:text-base leading-relaxed bg-white rounded-md p-6 md:p-8 border border-slate-100 shadow-sm" dangerouslySetInnerHTML={{ __html: bottom }} />
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Plain page links (PHP's ?page=N format) so search engines can reach every novel. */
function PageLinks({ base, page, pages }: { base: string; page: number; pages: number }) {
  const href = (n: number) => (n <= 1 ? base : `${base}?page=${n}`);
  const nums = [...new Set([1, 2, page - 1, page, page + 1, pages - 1, pages].filter((n) => n >= 1 && n <= pages))].sort((a, b) => a - b);
  return (
    <nav className="kn-pages" aria-label="Pages">
      {page > 1 ? (
        <a href={href(page - 1)} rel="prev">
          ‹ Previous
        </a>
      ) : null}
      {nums.map((n, i) => (
        <span key={n} style={{ display: "contents" }}>
          {i > 0 && n - nums[i - 1] > 1 ? <span className="gap">…</span> : null}
          {n === page ? <b aria-current="page">{n}</b> : <a href={href(n)}>{n}</a>}
        </span>
      ))}
      {page < pages ? (
        <a href={href(page + 1)} rel="next">
          Next ›
        </a>
      ) : null}
    </nav>
  );
}
