import "@/styles/single.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fillTitle, getSettings, siteUrl } from "@/lib/settings";
import { getArchive, getCategory, getWriter, resolveSlug } from "@/lib/data";
import { buildMeta, ogImage } from "@/lib/seo";
import ArchiveView from "@/components/site/ArchiveView";

/**
 * Page 2, 3, … of a category or writer. The public address stays PHP's
 * /<slug>/?page=N — the proxy rewrites it here, so pages are cached like any other.
 */

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string; n: string }> };

async function load(slug: string, nRaw: string) {
  const n = parseInt(nRaw, 10);
  if (!(n >= 2) || String(n) !== nRaw) return null;
  const r = await resolveSlug(slug);
  if (r.kind !== "category" && r.kind !== "writer") return null;
  const { totalPages, total } = await getArchive(r.kind === "category" ? { categoryId: r.id } : { writerId: r.id }, 1, 12);
  if (n > totalPages) return null;
  return { r, n, totalPages, total };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, n: nRaw } = await params;
  const x = await load(slug, nRaw);
  if (!x) return { title: "Page Not Found", robots: "noindex, follow" };
  const [s, base] = [await getSettings(), siteUrl()];
  const suffix = ` – Page ${x.n} of ${x.totalPages}`;
  if (x.r.kind === "category") {
    const c = (await getCategory(x.r.id))!;
    return buildMeta(s, base, {
      title: (c.meta_title || fillTitle(s, s.seo_tpl_category, { title: c.name })) + suffix,
      description: `Page ${x.n}: ${c.meta_description || `Explore all novels under category ${c.name}`}`,
      path: `/${c.slug}/?page=${x.n}`,
      image: c.image ? ogImage(c.image, base) : undefined,
    });
  }
  const w = (await getWriter(x.r.id))!;
  return buildMeta(s, base, {
    title: (w.meta_title || fillTitle(s, s.seo_tpl_writer, { title: w.name })) + suffix,
    description: `Page ${x.n}: ${(w.meta_description || `Explore all novels written by ${w.name}`).replace("{count}", String(x.total))}`,
    path: `/${w.slug}/?page=${x.n}`,
    image: w.profile_pic ? ogImage(w.profile_pic, base) : undefined,
  });
}

export default async function ArchivePage({ params }: Props) {
  const { slug, n: nRaw } = await params;
  const x = await load(slug, nRaw);
  if (!x) notFound();
  return <ArchiveView kind={x.r.kind as "category" | "writer"} id={x.r.id} page={x.n} />;
}
