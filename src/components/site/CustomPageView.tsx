import JsonLd from "../JsonLd";
import { breadcrumb } from "@/lib/seo";
import { siteUrl } from "@/lib/settings";
import { stripTags } from "@/lib/utils";

export default function CustomPageView({ page }: { page: { title: string; slug: string; content: string } }) {
  const base = siteUrl();
  const url = `${base}/${page.slug}/`;
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", "@id": `${url}#webpage`, url, name: page.title, description: stripTags(page.content).slice(0, 250), isPartOf: { "@id": `${base}/#website` }, inLanguage: "en" }} />
      <JsonLd data={breadcrumb(base, [{ name: page.title, path: `/${page.slug}/` }])} />
      <div className="border-b border-slate-100 bg-white/40 backdrop-blur-md py-12">
        <div className="global-container text-center">
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900">{page.title}</h1>
        </div>
      </div>
      <div className="global-container py-12">
        <div className="p-1 md:p-3">
          <div className="prose prose-slate max-w-none article-content" dangerouslySetInnerHTML={{ __html: page.content }} />
        </div>
      </div>
    </>
  );
}
