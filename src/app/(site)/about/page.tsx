import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, siteUrl } from "@/lib/settings";
import { breadcrumb, buildMeta } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return buildMeta(s, siteUrl(), {
    title: s.about_meta_title?.trim() || "About Us",
    description: s.about_meta_description?.trim() || `Learn about ${s.site_name} and our mission to share quality novels and stories.`,
    path: "/about/",
  });
}

export default async function AboutPage() {
  const s = await getSettings();
  const title = s.about_page_title?.trim() || "About Us";
  return (
    <>
      <JsonLd data={breadcrumb(siteUrl(), [{ name: title, path: "/about/" }])} />
      <section className="static-hero">
        <div className="global-container static-hero__inner">
          <h1 className="static-hero__title">{title}</h1>
          <p className="static-hero__subtitle">{s.about_page_subtitle?.trim() || "Your ultimate source for reading premium novels, stories, and books."}</p>
        </div>
      </section>
      <section className="global-container static-body">
        <div className="static-card static-card--wide">
          {s.about_page_content?.trim() ? (
            <div className="static-prose" dangerouslySetInnerHTML={{ __html: s.about_page_content }} />
          ) : (
            <div className="static-prose">
              <h2>Our Mission</h2>
              <p>At {s.site_name}, our core mission is to provide high-quality novels, stories, and series across a variety of genres.</p>
              <p>We believe in spreading the joy of reading and supporting talented writers. Our platform is dedicated to curating and providing updated, readable, and accessible novels for readers around the globe.</p>
            </div>
          )}
          <div className="static-cta">
            <Link href="/" className="btn-brand">
              Start Exploring Novels
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
