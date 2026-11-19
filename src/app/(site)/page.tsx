import "@/styles/index.css";
import "@/styles/carousel.css";
import type { Metadata } from "next";
import { preload } from "react-dom";
import { thumbUrl } from "@/lib/utils";
import { getSettings, siteUrl } from "@/lib/settings";
import { getCarouselCategories, getCarouselWriters, getPostsByIdsOrdered, getRecentPosts, getTrendingPosts } from "@/lib/data";
import { buildMeta } from "@/lib/seo";
import BookCard from "@/components/site/BookCard";
import JsonLd from "@/components/JsonLd";
import { Banners } from "@/components/site/HomeClient";
import RoundCarousel from "@/components/site/RoundCarousel";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const title = s.homepage_title || `${s.site_name}${s.tagline ? " - " + s.tagline : ""}`;
  return buildMeta(s, siteUrl(), { title, description: s.homepage_description || s.seo_description, path: "/" });
}

export default async function HomePage() {
  const s = await getSettings();
  const [cats, writers, recent, famous, trending] = await Promise.all([
    getCarouselCategories(),
    getCarouselWriters(),
    getRecentPosts(8),
    getPostsByIdsOrdered((s.homepage_famous_ids || []).slice(0, 24)),
    getTrendingPosts(8),
  ]);
  // the first cover is the biggest thing on a phone screen: start downloading it from the <head>
  const lcp = recent[0]?.image;
  if (lcp) preload(thumbUrl(lcp, 400), { as: "image", imageSrcSet: `${thumbUrl(lcp, 200)} 200w, ${thumbUrl(lcp, 400)} 400w`, imageSizes: "(min-width: 1024px) 12vw, (min-width: 768px) 25vw, 50vw", fetchPriority: "high" });
  const base = siteUrl();
  const famousTitle = s.homepage_famous_title?.trim() || "Famous Novels";
  const title = s.homepage_title || s.site_name;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${base}/#webpage`,
          url: `${base}/`,
          name: title,
          description: s.homepage_description || s.seo_description,
          isPartOf: { "@id": `${base}/#website` },
          about: { "@id": `${base}/#organization` },
          inLanguage: "en",
        }}
      />
      {cats.length ? (
        <div style={{ width: "100%", padding: "10px 0", position: "relative", boxSizing: "border-box", margin: 0 }}>
          <div className="global-container relative">
            <RoundCarousel items={cats} label="Categories" />
          </div>
        </div>
      ) : null}

      <div className="global-container pt-1 pb-6">
        {recent.length ? (
          <>
            <div className="mb-3 mt-1">
              <h2 className="font-headline-sm text-headline-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-compass text-primary"></i> Recent Uploads
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-card-gap">
              {recent.map((p, i) => (
                <BookCard key={p.id} post={p} eager={i < 2} />
              ))}
            </div>
          </>
        ) : null}

        <Banners mobile={s.banner_mobile || []} desktop={s.banner_desktop || []} />

        {famous.length ? (
          <>
            <div className="flex justify-between items-center mb-3 mt-6">
              <h2 className="font-headline-sm text-headline-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-star text-primary"></i> {famousTitle}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-card-gap">
              {famous.map((p) => (
                <BookCard key={p.id} post={p} />
              ))}
            </div>
          </>
        ) : null}

        {trending.length >= 4 ? (
          <>
            <div className="flex justify-between items-center mb-3 mt-6">
              <h2 className="font-headline-sm text-headline-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-fire text-primary"></i> Most Read
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-card-gap">
              {trending.map((p) => (
                <BookCard key={p.id} post={p} />
              ))}
            </div>
          </>
        ) : null}

        {!recent.length && !famous.length ? <p className="py-10 text-center text-slate-500">No posts available at the moment.</p> : null}

        {writers.length ? (
          <section className="round-rail mt-6" aria-label="Writers">
            <h2 className="font-headline-sm text-headline-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
              <i className="fa-solid fa-user-pen text-primary"></i> Writers
            </h2>
            <RoundCarousel items={writers} label="Writers" eager={0} />
          </section>
        ) : null}

        {s.homepage_content || s.homepage_content_title ? (
          <section className="home-bottom-content mt-8 md:mt-10 pt-6 border-t border-slate-200" aria-label="Homepage content">
            {s.homepage_content_title ? <h2 className="font-headline-sm text-headline-sm font-bold text-slate-800 dark:text-white mb-3">{s.homepage_content_title}</h2> : null}
            {s.homepage_content ? <div className="static-prose" dangerouslySetInnerHTML={{ __html: s.homepage_content }} /> : null}
          </section>
        ) : null}
      </div>
    </>
  );
}
