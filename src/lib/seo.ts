import type { Metadata } from "next";
import type { Settings } from "./types";
import { mediaUrl, stripTags } from "./utils";

/** Absolute image URL for Open Graph (WhatsApp / Facebook need full URLs). */
export function ogImage(path: string | null | undefined, base: string): string {
  const u = mediaUrl(path);
  if (!u || u.startsWith("data:")) return "";
  return /^https?:/i.test(u) ? u : base + u;
}

export interface MetaInput {
  title: string;
  description: string;
  path: string; // canonical path, e.g. "/about/"
  image?: string;
  type?: "website" | "article" | "product";
  robots?: string;
  author?: string;
  published?: string;
  modified?: string;
}

const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF]/g;
export function cleanText(t: string) {
  return String(t || "").replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
}
/** Google shows about 155–160 characters: cut on a word, never mid-word. */
export function metaDescription(t: string, max = 158) {
  const s = cleanText(t);
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 25)).replace(/[\s,.;:–—-]+$/, "") + "…";
}

/** Same tags the PHP header.php printed (canonical, OG, Twitter, article dates). */
export function buildMeta(s: Settings, base: string, raw: MetaInput): Metadata {
  const m = { ...raw, title: cleanText(raw.title), description: metaDescription(raw.description) };
  const url = base + m.path;
  const img = m.image || ogImage(s.homepage_featured_image || s.site_logo, base);
  const robots = m.robots || "index, follow";
  const other: Record<string, string> = { publisher: s.site_name };
  if (m.published) other["publish-date"] = m.published;
  if (m.modified) other["modified-date"] = m.modified;
  return {
    metadataBase: new URL(base),
    title: { absolute: m.title },
    description: m.description,
    keywords: s.seo_keywords || undefined,
    robots,
    authors: m.author ? [{ name: m.author }] : undefined,
    alternates: { canonical: url },
    icons: s.site_favicon ? { icon: mediaUrl(s.site_favicon), shortcut: mediaUrl(s.site_favicon) } : undefined,
    openGraph:
      m.type === "article"
        ? {
            siteName: s.site_name,
            title: m.title,
            description: m.description,
            url,
            type: "article",
            locale: "en_US",
            publishedTime: m.published,
            modifiedTime: m.modified,
            authors: m.author ? [m.author] : undefined,
            images: img ? [{ url: img, alt: m.title }] : undefined,
          }
        : {
            siteName: s.site_name,
            title: m.title,
            description: m.description,
            url,
            type: "website",
            locale: "en_US",
            images: img ? [{ url: img, alt: m.title }] : undefined,
          },
    twitter: {
      card: "summary_large_image",
      site: s.twitter_handle || undefined,
      title: m.title,
      description: m.description,
      images: img ? [{ url: img, alt: m.title }] : undefined,
    },
    other,
  };
}

export function websiteSchema(s: Settings, base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    name: s.site_name,
    url: `${base}/`,
    description: s.homepage_description || s.seo_description || "",
    inLanguage: "en",
    publisher: { "@id": `${base}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/search/?search={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function orgSchema(s: Settings, base: string) {
  const sameAs = [s.facebook_url, s.instagram_url, s.tiktok_url, s.youtube_url, s.twitter_url, s.pinterest_url, s.telegram_url].filter(Boolean);
  const logo = ogImage(s.site_logo, base);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: s.site_name,
    url: `${base}/`,
    ...(logo ? { logo: { "@type": "ImageObject", url: logo, caption: s.site_name } } : {}),
    sameAs,
    ...(s.contact_email ? { contactPoint: { "@type": "ContactPoint", email: s.contact_email, contactType: "customer support", availableLanguage: ["English"] } } : {}),
  };
}

export function breadcrumb(base: string, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...items].map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: base + it.path,
    })),
  };
}

export function bookSchema(base: string, n: { title: string; slug: string; description: string; image: string; posted_date: string; writer?: { name: string; slug: string } | null; file_type: string; pages: number | null }) {
  const url = `${base}/${n.slug}/`;
  return {
    "@context": "https://schema.org",
    "@type": "Book",
    "@id": `${url}#book`,
    name: n.title,
    url,
    ...(n.image ? { image: ogImage(n.image, base) } : {}),
    description: stripTags(n.description).slice(0, 300),
    inLanguage: "en",
    bookFormat: "https://schema.org/EBook",
    ...(n.pages ? { numberOfPages: n.pages } : {}),
    datePublished: n.posted_date,
    author: { "@type": "Person", "@id": `${base}/writer/${n.writer?.slug || ""}/#author`, name: n.writer?.name || "" },
    publisher: { "@id": `${base}/#organization` },
    ...(n.file_type ? { potentialAction: { "@type": "ReadAction", target: [url] } } : {}),
  };
}
