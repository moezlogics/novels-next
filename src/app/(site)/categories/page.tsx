import "@/styles/categories.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, siteUrl } from "@/lib/settings";
import { getCategoriesWithCounts } from "@/lib/data";
import { breadcrumb, buildMeta } from "@/lib/seo";
import { letterImage, stripTags, thumbUrl } from "@/lib/utils";
import JsonLd from "@/components/JsonLd";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return buildMeta(s, siteUrl(), {
    title: s.categories_meta_title?.trim() || "All Urdu Novels Categories",
    description: s.categories_meta_description?.trim() || `Explore all novel categories on ${s.site_name}. Find Urdu novels by genre with free online reading and PDF downloads.`,
    path: "/categories/",
  });
}

export default async function CategoriesPage() {
  const [s, cats] = await Promise.all([getSettings(), getCategoriesWithCounts()]);
  const base = siteUrl();
  const title = s.categories_page_title?.trim() || "All Urdu Novels Categories";
  const subtitle = s.categories_page_subtitle?.trim() || `Browse all novel genres on ${s.site_name} — romantic, Islamic, complete novels and more.`;
  const desc = s.categories_meta_description?.trim() || `Explore all novel categories on ${s.site_name}.`;
  const url = `${base}/categories/`;
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", "@id": `${url}#collectionpage`, url, name: title, description: desc, isPartOf: { "@id": `${base}/#website` }, inLanguage: "en" }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: title, itemListElement: cats.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, url: `${base}/${c.slug}/` })) }} />
      <JsonLd data={breadcrumb(base, [{ name: title, path: "/categories/" }])} />

      <section className="cat-page-hero">
        <div className="global-container cat-page-hero__inner">
          <nav aria-label="Breadcrumb">
            <ol className="cat-page-breadcrumb">
              <li>
                <Link href="/">Home</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">{title}</li>
            </ol>
          </nav>
          <h1 className="cat-page-hero__title">{title}</h1>
          <p className="cat-page-hero__subtitle">{subtitle}</p>
        </div>
      </section>

      <section className="global-container cat-page-body">
        {s.categories_page_content ? <div className="cat-page-intro static-prose" dangerouslySetInnerHTML={{ __html: s.categories_page_content }} /> : null}
        {cats.length ? (
          <div className="cat-page-grid">
            {cats.map((c, i) => {
              const d = stripTags(c.description) || `Read and download ${c.name} novels online for free.`;
              return (
                <Link key={c.id} href={`/${c.slug}/`} className="cat-page-card" title={`${c.name} novels`}>
                  <div className="cat-page-icon">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.image ? thumbUrl(c.image, 200) : letterImage(c.name)} alt={`${c.name} category`} width={84} height={84} loading={i >= 8 ? "lazy" : "eager"} decoding="async" />
                  </div>
                  <h2 className="cat-page-name">{c.name}</h2>
                  <p className="cat-page-count">{c.count === 1 ? "1 novel" : `${c.count.toLocaleString()} novels`}</p>
                  <p className="cat-page-desc">{d}</p>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="cat-page-empty">No categories found.</p>
        )}
      </section>
    </>
  );
}
