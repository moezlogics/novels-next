import "@/styles/single.css";
import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { findRedirect } from "@/lib/redirects";
import { fillTitle, getSettings, siteUrl } from "@/lib/settings";
import { getArchive, getCategory, getComments, getNovel, getPage, getWriter, resolveSlug } from "@/lib/data";
import { buildMeta, ogImage } from "@/lib/seo";
import { excerpt } from "@/lib/utils";
import NovelView from "@/components/novel/NovelView";
import ArchiveView from "@/components/site/ArchiveView";
import CustomPageView from "@/components/site/CustomPageView";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [s, r] = await Promise.all([getSettings(), resolveSlug(slug)]);
  const base = siteUrl();
  if (r.kind === "post") {
    const n = await getNovel(r.id);
    if (!n) return {};
    return buildMeta(s, base, {
      title: n.meta_title || fillTitle(s, s.seo_tpl_novel, { title: n.title, writer: n.writer?.name || "" }),
      description: n.meta_description || excerpt(n.description, 155),
      path: `/${n.slug}/`,
      image: ogImage(n.image, base),
      type: "article",
      author: n.writer?.name,
      published: n.posted_date,
      modified: n.updated_at,
    });
  }
  if (r.kind === "category") {
    const c = await getCategory(r.id);
    if (!c) return {};
    return buildMeta(s, base, {
      title: c.meta_title || fillTitle(s, s.seo_tpl_category, { title: c.name }),
      description: c.meta_description || `Explore all novels under category ${c.name}`,
      path: `/${c.slug}/`,
      image: c.image ? ogImage(c.image, base) : undefined,
    });
  }
  if (r.kind === "writer") {
    const w = await getWriter(r.id);
    if (!w) return {};
    const { total } = await getArchive({ writerId: w.id }, 1, 12);
    return buildMeta(s, base, {
      title: w.meta_title || fillTitle(s, s.seo_tpl_writer, { title: w.name }),
      description: (w.meta_description || `Explore all novels written by ${w.name}`).replace("{count}", String(total)).replace(/\b1 (Urdu )?novels\b/i, "1 $1novel"),
      path: `/${w.slug}/`,
      image: w.profile_pic ? ogImage(w.profile_pic, base) : undefined,
    });
  }
  if (r.kind === "page") {
    const p = await getPage(r.id);
    if (!p) return {};
    return buildMeta(s, base, {
      title: p.meta_title || fillTitle(s, s.seo_tpl_page, { title: p.title }),
      description: p.meta_description || excerpt(p.content, 155),
      path: `/${p.slug}/`,
      published: p.created_at,
      modified: p.updated_at,
    });
  }
  return { title: "Page Not Found", robots: "noindex, follow" };
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params;
  const r = await resolveSlug(slug);
  if (r.kind === "post") {
    const [novel, comments] = await Promise.all([getNovel(r.id), getComments(r.id)]);
    if (!novel) notFound();
    return <NovelView novel={novel} comments={comments} />;
  }
  if (r.kind === "category" || r.kind === "writer") return <ArchiveView kind={r.kind} id={r.id} />;
  if (r.kind === "page") {
    const p = await getPage(r.id);
    if (!p) notFound();
    return <CustomPageView page={p} />;
  }
  const rd = await findRedirect(`/${slug}/`);
  if (rd) (rd.code === 302 ? redirect : permanentRedirect)(rd.to);
  notFound();
}
